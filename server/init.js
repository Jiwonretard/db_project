import "dotenv/config";
import { connectDb } from "./db.js";
if (process.env.DB_CLIENT !== "sqlite") {
  const name = process.env.DB_NAME || "codegarden";
  if (!/^[a-zA-Z0-9_]+$/.test(name))
    throw new Error("DB_NAME에는 영문, 숫자, 밑줄만 사용하세요.");
  const mysql = await import("mysql2/promise");
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });
  await c.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await c.end();
}
const db = await connectDb();
await db.close();
console.log("데이터베이스와 테이블 준비 완료");
