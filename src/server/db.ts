import Database from "better-sqlite3";
import { CATEGORIES, GROUPS } from "../shared/types";

export type Db = Database.Database;

const quoted = (values: readonly string[]) =>
  values.map((value) => `'${value}'`).join(", ");

const MIGRATIONS = [
  `
  CREATE TABLE templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    "group" TEXT NOT NULL CHECK ("group" IN (${quoted(GROUPS)})),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    position INTEGER NOT NULL
  );

  CREATE TABLE entries (
    month TEXT NOT NULL,
    template_id TEXT NOT NULL REFERENCES templates (id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    paid_at TEXT,
    PRIMARY KEY (month, template_id)
  );

  CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    category TEXT NOT NULL CHECK (category IN (${quoted(CATEGORIES)})),
    spent_on TEXT NOT NULL
  );

  CREATE INDEX expenses_spent_on ON expenses (spent_on);
  `,
];

function migrate(db: Db) {
  const applied = db.pragma("user_version", { simple: true }) as number;
  MIGRATIONS.slice(applied).forEach((sql, index) => {
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${applied + index + 1}`);
    })();
  });
}

export function openDatabase(path: string): Db {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  if (path !== ":memory:") db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}
