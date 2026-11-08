import { connectDb } from "./db.js";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
const db = await connectDb();
const samples = [
  [
    "min.dev",
    "min@example.test",
    "JavaScript",
    "비동기 함수에서 순서가 뒤바뀌어요",
    "async function loadUsers(ids) {\n  const users = [];\n  ids.forEach(async (id) => {\n    users.push(await fetchUser(id));\n  });\n  return users;\n}",
    "사용자 목록이 모두 로딩되기 전에 빈 배열이 반환됩니다. 순서를 유지하면서 기다리려면 어떻게 바꿔야 할까요?",
  ],
  [
    "yun.codes",
    "yun@example.test",
    "Python",
    "중복을 제거하면서 순서를 유지하려면?",
    "def unique(items):\n    result = []\n    for item in items:\n        if item not in result:\n            result.append(item)\n    return result",
    "데이터가 많아지니까 처리 속도가 느려집니다. 중복을 없애면서 원래 순서는 지키고 싶어요.",
  ],
  [
    "june",
    "june@example.test",
    "TypeScript",
    "API 응답의 타입을 안전하게 다루고 싶어요",
    'type User = { name: string };\nasync function getUser(): Promise<User> {\n  const res = await fetch("/api/user");\n  return res.json();\n}',
    "타입은 선언했지만 실제 API 응답이 다를 때는 오류가 납니다. 런타임 검증은 어떻게 할 수 있나요?",
  ],
  [
    "min.dev",
    "min@example.test",
    "JavaScript",
    "리액트 상태를 바꿨는데 화면은 그대로예요",
    "function addTodo(text) {\n  todos.push({ text, done: false });\n  setTodos(todos);\n}",
    "새 할 일을 추가해도 목록이 바로 갱신되지 않아요. 배열과 상태 업데이트의 관계가 궁금합니다.",
  ],
  [
    "yun.codes",
    "yun@example.test",
    "SQL",
    "회원별 작성글 개수, 0개인 회원도 보여주기",
    "SELECT u.nickname, COUNT(p.id)\nFROM users u\nJOIN posts p ON u.id = p.user_id\nGROUP BY u.id, u.nickname;",
    "게시글을 작성하지 않은 회원이 결과에서 빠집니다. 모든 회원의 글 개수를 조회하고 싶어요.",
  ],
  [
    "june",
    "june@example.test",
    "Java",
    "문자열 비교에서 예상과 다른 결과가 나와요",
    'String name = new String("garden");\nif (name == "garden") {\n    System.out.println("같아요!");\n}',
    "같은 문자열인데 조건문이 실행되지 않습니다. 자바에서 문자열을 비교하는 올바른 방법이 궁금해요.",
  ],
];
for (const [nickname, email, language, title, code, question] of samples) {
  let user = await db.one("SELECT id FROM users WHERE email=?", [email]);
  if (!user) {
    user = { id: randomUUID() };
    await db.run(
      "INSERT INTO users(id,email,password_hash,nickname,bio,created_at) VALUES(?,?,?,?,?,?)",
      [
        user.id,
        email,
        await bcrypt.hash(randomUUID() + randomUUID(), 12),
        nickname,
        "학습용 샘플 프로필입니다.",
        new Date().toISOString(),
      ],
    );
  }
  if (
    !(await db.one("SELECT id FROM posts WHERE title=? AND user_id=?", [
      title,
      user.id,
    ]))
  ) {
    const date = new Date().toISOString();
    await db.run(
      "INSERT INTO posts(id,user_id,title,language,code,question,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
      [randomUUID(), user.id, title, language, code, question, date, date],
    );
  }
}
await db.close();
console.log(
  "학습용 예시 6개 준비 완료. 본인 계정은 회원가입으로 만들어주세요.",
);
