import "dotenv/config";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
export async function connectDb({
  client = process.env.DB_CLIENT || "mysql",
  sqlitePath = process.env.SQLITE_PATH || "./data/codegarden.sqlite",
} = {}) {
  let db;
  if (client === "sqlite") {
    const { DatabaseSync } = await import("node:sqlite");
    if (sqlitePath !== ":memory:")
      mkdirSync(dirname(resolve(sqlitePath)), { recursive: true });
    const conn = new DatabaseSync(sqlitePath);
    conn.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
    db = {
      client,
      all: async (sql, args = []) => conn.prepare(sql).all(...args),
      run: async (sql, args = []) => {
        const r = conn.prepare(sql).run(...args);
        return { changes: Number(r.changes) };
      },
      exec: async (sql) => conn.exec(sql),
      close: async () => conn.close(),
    };
  } else if (client === "mysql") {
    const mysql = await import("mysql2/promise");
    const conn = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "codegarden",
      charset: "utf8mb4",
      connectionLimit: 5,
    });
    db = {
      client,
      all: async (sql, args = []) => {
        const [r] = await conn.execute(sql, args);
        return r;
      },
      run: async (sql, args = []) => {
        const [r] = await conn.execute(sql, args);
        return { changes: r.affectedRows };
      },
      exec: async (sql) => conn.query(sql),
      close: async () => conn.end(),
    };
  } else throw new Error("DB_CLIENT는 mysql 또는 sqlite여야 합니다.");
  let schema = readFileSync(
    new URL("../sql/schema.sql", import.meta.url),
    "utf8",
  );
  if (client === "sqlite")
    schema = schema
      .replaceAll(" ENGINE=InnoDB DEFAULT CHARSET=utf8mb4", "")
      .replace(/,\s*INDEX posts_created \(created_at\)/, "");
  try {
    for (const statement of schema.split(";").filter((s) => s.trim()))
      await db.exec(statement);
  } catch (error) {
    await db.close();
    throw error;
  }
  db.one = async (sql, args = []) => (await db.all(sql, args))[0];
  return db;
}
