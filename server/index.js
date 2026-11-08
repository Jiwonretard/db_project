import "dotenv/config";
import express from "express";
import { resolve } from "node:path";
import { connectDb } from "./db.js";
import { createApp } from "./app.js";
try {
  const db = await connectDb();
  const app = createApp(db);
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(resolve("dist")));
    app.get("/{*splat}", (req, res) =>
      res.sendFile(resolve("dist/index.html")),
    );
  }
  const server = app.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
    console.log(
      `Codegarden API: http://127.0.0.1:${process.env.PORT || 3001} (${db.client})`,
    ),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () =>
      server.close(async () => {
        await db.close();
        process.exit(0);
      }),
    );
} catch (err) {
  console.error(
    "DB 연결 실패. .env 설정 및 npm run db:init을 확인하세요.",
    err.code || err.message,
  );
  process.exit(1);
}
