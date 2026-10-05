import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { type Db, openDatabase } from "../db";
import { createExpenses } from "../expenses";

let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = openDatabase(":memory:");
  app = createApp(db);
});

afterEach(() => db.close());

const send = (method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const createTemplate = async () => {
  const res = await send("POST", "/api/templates", {
    name: "Rent",
    amountCents: 100000,
    dueDay: 10,
    group: "fixed",
  });
  return (await res.json()) as { id: string };
};

describe("GET /api/months/:month", () => {
  it("returns an empty month", async () => {
    const res = await send("GET", "/api/months/2026-10");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      month: "2026-10",
      templates: [],
      entries: [],
      expenses: [],
    });
  });

  it("returns every template but only the entries and expenses of the month", async () => {
    const template = await createTemplate();
    await send("PUT", `/api/months/2026-10/entries/${template.id}`, {
      amountCents: 100000,
      paidAt: null,
    });
    await send("PUT", `/api/months/2026-09/entries/${template.id}`, {
      amountCents: 90000,
      paidAt: "2026-09-10",
    });
    const expenses = createExpenses(db);
    expenses.create({
      description: "Lunch",
      amountCents: 4590,
      category: "leisure",
      spentOn: "2026-10-03",
    });
    expenses.create({
      description: "Old",
      amountCents: 1000,
      category: "other",
      spentOn: "2026-09-03",
    });

    const body = await (await send("GET", "/api/months/2026-10")).json();

    expect(body.templates).toHaveLength(1);
    expect(body.entries).toEqual([
      { templateId: template.id, amountCents: 100000, paidAt: null },
    ]);
    expect(
      body.expenses.map((e: { description: string }) => e.description),
    ).toEqual(["Lunch"]);
  });

  it.each(["2026-1", "2026-13", "october", "2026-10-01"])(
    "rejects the month %j",
    async (month) => {
      const res = await send("GET", `/api/months/${month}`);

      expect(res.status).toBe(400);
    },
  );
});

describe("PUT /api/months/:month/entries/:templateId", () => {
  it("stores a paid entry", async () => {
    const template = await createTemplate();
    const entry = { amountCents: 105000, paidAt: "2026-10-05" };
    const res = await send(
      "PUT",
      `/api/months/2026-10/entries/${template.id}`,
      entry,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ templateId: template.id, ...entry });
  });

  it("marks an entry as unpaid again", async () => {
    const template = await createTemplate();
    const path = `/api/months/2026-10/entries/${template.id}`;
    await send("PUT", path, { amountCents: 100000, paidAt: "2026-10-05" });
    await send("PUT", path, { amountCents: 100000, paidAt: null });

    const body = await (await send("GET", "/api/months/2026-10")).json();
    expect(body.entries[0].paidAt).toBeNull();
  });

  it.each([
    ["a zero amount", { amountCents: 0, paidAt: null }],
    ["a fractional amount", { amountCents: 10.5, paidAt: null }],
    ["an impossible date", { amountCents: 100, paidAt: "2026-13-40" }],
    ["a date without a day", { amountCents: 100, paidAt: "2026-10" }],
    ["a missing paidAt", { amountCents: 100 }],
  ])("rejects %s", async (_label, body) => {
    const template = await createTemplate();
    const res = await send(
      "PUT",
      `/api/months/2026-10/entries/${template.id}`,
      body,
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown template", async () => {
    const res = await send("PUT", "/api/months/2026-10/entries/missing", {
      amountCents: 100,
      paidAt: null,
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Template not found" });
  });

  it("rejects an invalid month", async () => {
    const template = await createTemplate();
    const res = await send("PUT", `/api/months/nope/entries/${template.id}`, {
      amountCents: 100,
      paidAt: null,
    });

    expect(res.status).toBe(400);
  });
});
