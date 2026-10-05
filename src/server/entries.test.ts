import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./db";
import { createEntries } from "./entries";
import { createTemplates } from "./templates";

let db: Db;
let entries: ReturnType<typeof createEntries>;
let rentId: string;

beforeEach(() => {
  db = openDatabase(":memory:");
  entries = createEntries(db);
  rentId = createTemplates(db).create({
    name: "Rent",
    amountCents: 100000,
    dueDay: 10,
    group: "fixed",
  }).id;
});

afterEach(() => db.close());

describe("entries", () => {
  it("starts empty", () => {
    expect(entries.listForMonth("2026-10")).toEqual([]);
  });

  it("stores an entry for a month", () => {
    const entry = { templateId: rentId, amountCents: 100000, paidAt: null };

    expect(entries.save("2026-10", entry)).toEqual(entry);
    expect(entries.listForMonth("2026-10")).toEqual([entry]);
  });

  it("overwrites the entry of the same template and month", () => {
    entries.save("2026-10", {
      templateId: rentId,
      amountCents: 100000,
      paidAt: null,
    });
    const paid = {
      templateId: rentId,
      amountCents: 105000,
      paidAt: "2026-10-05",
    };
    entries.save("2026-10", paid);

    expect(entries.listForMonth("2026-10")).toEqual([paid]);
  });

  it("keeps months apart", () => {
    entries.save("2026-10", {
      templateId: rentId,
      amountCents: 100000,
      paidAt: "2026-10-05",
    });

    expect(entries.listForMonth("2026-11")).toEqual([]);
  });

  it("refuses an entry for an unknown template", () => {
    expect(() =>
      entries.save("2026-10", {
        templateId: "missing",
        amountCents: 100,
        paidAt: null,
      }),
    ).toThrow();
  });
});
