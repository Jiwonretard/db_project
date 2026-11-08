import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcrypt";
import { connectDb } from "../server/db.js";
import { createApp } from "../server/app.js";
const payload = {
  title: "비동기 코드 질문",
  language: "JavaScript",
  code: "const value = await Promise.resolve(42);",
  question: "이 코드의 동작을 설명해주세요.",
};
test("회원 CRUD, JOIN, 작성자 권한, AI 저장, 탈퇴 연쇄 삭제", async () => {
  const db = await connectDb({
    client: process.env.TEST_DB_CLIENT || "sqlite",
    sqlitePath: ":memory:",
  });
  const app = createApp(db, {
    disableRateLimit: true,
    reviewer: async () => "## 한눈에 보기\nPromise를 기다립니다.",
  });
  const a = request.agent(app),
    b = request.agent(app);
  const email = `a-${Date.now()}@example.test`,
    password = "testpassword123";
  try {
    assert.equal((await a.post("/api/posts").send(payload)).status, 401);
    const reg = await a
      .post("/api/auth/register")
      .send({ email, password, nickname: "개발자A" });
    assert.equal(reg.status, 201);
    assert.ok(!reg.body.user.password_hash);
    assert.equal(
      (
        await b
          .post("/api/auth/register")
          .send({ email, password, nickname: "중복" })
      ).status,
      409,
    );
    const raw = await db.one("SELECT password_hash FROM users WHERE id=?", [
      reg.body.user.id,
    ]);
    assert.ok(raw.password_hash.startsWith("$2"));
    assert.ok(await bcrypt.compare(password, raw.password_hash));
    assert.equal(
      (
        await a
          .patch("/api/users/me")
          .send({ nickname: "수정닉네임", bio: "학습 중" })
      ).body.user.nickname,
      "수정닉네임",
    );
    const post = await a.post("/api/posts").send(payload);
    assert.equal(post.status, 201);
    const id = post.body.post.id;
    await b
      .post("/api/auth/register")
      .send({ email: `b-${email}`, password, nickname: "개발자B" });
    assert.equal((await b.patch("/api/posts/" + id).send(payload)).status, 403);
    assert.equal((await b.delete("/api/posts/" + id)).status, 403);
    assert.equal((await b.post(`/api/posts/${id}/review`)).status, 403);
    const list = await request(app).get("/api/posts");
    assert.equal(list.body.posts.find((p) => p.id === id).author, "수정닉네임");
    const community = await request(app).get("/api/community");
    assert.equal(
      Number(
        community.body.members.find((u) => u.id === reg.body.user.id)
          .post_count,
      ),
      1,
    );
    assert.equal(
      (await request(app).get("/api/posts?q=%27%20OR%201%3D1--")).body.posts
        .length,
      0,
    );
    assert.equal((await a.post(`/api/posts/${id}/review`)).status, 200);
    assert.ok(
      (await a.get("/api/posts/" + id)).body.post.ai_review.includes("Promise"),
    );
    assert.equal(
      (await a.patch("/api/posts/" + id).send({ ...payload, code: "let x=1;" }))
        .body.post.ai_review,
      null,
    );
    assert.equal((await a.delete("/api/posts/" + id)).status, 200);
    assert.equal((await a.get("/api/posts/" + id)).status, 404);
    await a.post("/api/posts").send(payload);
    assert.equal((await a.post("/api/auth/logout")).status, 200);
    assert.equal((await a.get("/api/auth/me")).body.user, null);
    assert.equal(
      (
        await a
          .post("/api/auth/login")
          .send({ email, password: "wrongpassword" })
      ).status,
      401,
    );
    assert.equal(
      (await a.post("/api/auth/login").send({ email, password })).status,
      200,
    );
    assert.equal(
      (
        await a
          .patch("/api/users/me")
          .set("Origin", "https://evil.test")
          .send({ nickname: "공격" })
      ).status,
      403,
    );
    assert.equal(
      (await a.delete("/api/users/me").send({ password: "wrong" })).status,
      403,
    );
    assert.equal(
      (await a.delete("/api/users/me").send({ password })).status,
      200,
    );
    assert.equal((await a.get("/api/auth/me")).body.user, null);
    assert.equal(
      (await db.all("SELECT * FROM posts WHERE user_id=?", [reg.body.user.id]))
        .length,
      0,
    );
    assert.equal(
      (
        await db.all("SELECT * FROM sessions WHERE user_id=?", [
          reg.body.user.id,
        ])
      ).length,
      0,
    );
    await b.delete("/api/users/me").send({ password });
  } finally {
    await db.close();
  }
});
test("검증, 미설정 API, 오래된 AI 결과 충돌 처리", async () => {
  const db = await connectDb({ client: "sqlite", sqlitePath: ":memory:" });
  let resolveReview;
  const app = createApp(db, {
    disableRateLimit: true,
    reviewer: () =>
      new Promise((r) => {
        resolveReview = r;
      }),
  });
  const a = request.agent(app);
  try {
    assert.equal(
      (
        await a
          .post("/api/auth/register")
          .send({ email: "invalid", password: "123", nickname: "a" })
      ).status,
      400,
    );
    await a
      .post("/api/auth/register")
      .send({
        email: "c@example.test",
        password: "testpassword123",
        nickname: "개발자C",
      });
    assert.equal(
      (await a.post("/api/posts").send({ ...payload, language: "invalid" }))
        .status,
      400,
    );
    const { body } = await a.post("/api/posts").send(payload);
    const id = body.post.id;
    const pending = a.post(`/api/posts/${id}/review`).then((r) => r);
    while (!resolveReview) await new Promise((r) => setTimeout(r, 10));
    await a
      .patch("/api/posts/" + id)
      .send({ ...payload, code: "changed code" });
    resolveReview("outdated");
    assert.equal((await pending).status, 409);
    assert.equal((await a.get("/api/posts/" + id)).body.post.ai_review, null);
    const app2 = createApp(db, { disableRateLimit: true });
    const a2 = request.agent(app2);
    await a2
      .post("/api/auth/login")
      .send({ email: "c@example.test", password: "testpassword123" });
    const old = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      assert.equal((await a2.post(`/api/posts/${id}/review`)).status, 503);
    } finally {
      if (old) process.env.OPENAI_API_KEY = old;
    }
  } finally {
    await db.close();
  }
});
