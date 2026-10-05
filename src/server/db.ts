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
  `
  CREATE TABLE templates_next (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    "group" TEXT NOT NULL CHECK ("group" IN (${quoted(GROUPS)})),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    position INTEGER NOT NULL
  );
  INSERT INTO templates_next SELECT * FROM templates;
  DROP TABLE templates;
  ALTER TABLE templates_next RENAME TO templates;
  `,
  `
  ALTER TABLE templates ADD COLUMN auto_paid INTEGER NOT NULL DEFAULT 0 CHECK (auto_paid IN (0, 1));
  `,
  `
  CREATE TABLE chat_conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    session_id TEXT NOT NULL,
    started INTEGER NOT NULL DEFAULT 0 CHECK (started IN (0, 1)),
    created_at TEXT NOT NULL
  );

  CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX chat_messages_conversation ON chat_messages (conversation_id, id);
  `,
];

function migrate(db: Db) {
  const applied = db.pragma("user_version", { simple: true }) as number;

  db.pragma("foreign_keys = OFF");
  MIGRATIONS.slice(applied).forEach((sql, index) => {
    db.transaction(() => {
      db.exec(sql);
      if ((db.pragma("foreign_key_check") as unknown[]).length > 0) {
        throw new Error("Migration left rows that break a foreign key.");
      }
      db.pragma(`user_version = ${applied + index + 1}`);
    })();
  });
}

export function openDatabase(path: string): Db {
  const db = new Database(path);
  if (path !== ":memory:") db.pragma("journal_mode = WAL");
  migrate(db);
  db.pragma("foreign_keys = ON");
  return db;
}
