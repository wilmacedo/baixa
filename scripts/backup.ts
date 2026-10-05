import Database from "better-sqlite3";

const source = process.env.DATABASE_PATH ?? "data/baixa.db";
const target =
  process.argv[2] ??
  `${source.replace(/\.db$/, "")}-backup-${new Date().toISOString().slice(0, 10)}.db`;

const db = new Database(source, { readonly: true, fileMustExist: true });
await db.backup(target);
db.close();

console.log(`Backed up ${source} to ${target}`);
