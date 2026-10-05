import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./db";

const open: Db[] = [];
const track = (db: Db) => {
  open.push(db);
  return db;
};

afterEach(() => {
  for (const db of open.splice(0)) db.close();
});

const insertTemplate = (db: Db, overrides: Record<string, unknown> = {}) =>
  db
    .prepare(
      `INSERT INTO templates (id, name, amount_cents, due_day, "group", active, position)
       VALUES (@id, @name, @amount_cents, @due_day, @group, @active, @position)`,
    )
    .run({
      id: "t1",
      name: "Rent",
      amount_cents: 100000,
      due_day: 10,
      group: "fixed",
      active: 1,
      position: 1,
      ...overrides,
    });

describe("openDatabase", () => {
  it("creates the schema and records the version", () => {
    const db = track(openDatabase(":memory:"));
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY 1")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toEqual(["entries", "expenses", "templates"]);
    expect(db.pragma("user_version", { simple: true })).toBe(1);
  });

  it("keeps the data and the version when reopened", () => {
    const dir = mkdtempSync(join(tmpdir(), "baixa-"));
    try {
      const path = join(dir, "test.db");
      const first = openDatabase(path);
      insertTemplate(first);
      first.close();

      const second = track(openDatabase(path));
      expect(second.pragma("user_version", { simple: true })).toBe(1);
      expect(
        second.prepare("SELECT COUNT(*) AS n FROM templates").get(),
      ).toEqual({
        n: 1,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each([
    ["an unknown group", { group: "other" }],
    ["a zero amount", { amount_cents: 0 }],
    ["a due day above 31", { due_day: 32 }],
    ["a due day below 1", { due_day: 0 }],
  ])("rejects a template with %s", (_label, overrides) => {
    const db = track(openDatabase(":memory:"));
    expect(() => insertTemplate(db, overrides)).toThrow();
  });

  it("rejects an expense with an unknown category", () => {
    const db = track(openDatabase(":memory:"));
    expect(() =>
      db
        .prepare(
          "INSERT INTO expenses (id, description, amount_cents, category, spent_on) VALUES ('e1', 'Lunch', 2500, 'food', '2026-10-05')",
        )
        .run(),
    ).toThrow();
  });

  it("rejects an entry for a template that does not exist", () => {
    const db = track(openDatabase(":memory:"));
    expect(() =>
      db
        .prepare(
          "INSERT INTO entries (month, template_id, amount_cents) VALUES ('2026-10', 'missing', 1000)",
        )
        .run(),
    ).toThrow();
  });

  it("allows one entry per template and month", () => {
    const db = track(openDatabase(":memory:"));
    insertTemplate(db);
    const insert = db.prepare(
      "INSERT INTO entries (month, template_id, amount_cents) VALUES ('2026-10', 't1', 100000)",
    );
    insert.run();
    expect(() => insert.run()).toThrow();
  });
});
