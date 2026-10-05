import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { type Db, openDatabase } from "../db";

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

const lunch = {
  description: "Lunch",
  amountCents: 4590,
  category: "leisure",
  spentOn: "2026-10-03",
};

const expensesOf = async (month: string) =>
  (await (await send("GET", `/api/months/${month}`)).json()).expenses;

describe("GET /api/expenses/history", () => {
  it("lists the descriptions and categories of past expenses, oldest first", async () => {
    await send("POST", "/api/expenses", {
      ...lunch,
      description: "First",
      spentOn: "2026-09-01",
    });
    await send("POST", "/api/expenses", {
      ...lunch,
      description: "Second",
      category: "health",
    });

    const res = await send("GET", "/api/expenses/history");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { description: "First", category: "leisure" },
      { description: "Second", category: "health" },
    ]);
  });
});

describe("POST /api/expenses", () => {
  it("creates an expense that shows up in its month", async () => {
    const res = await send("POST", "/api/expenses", lunch);
    const created = await res.json();

    expect(res.status).toBe(201);
    expect(created).toMatchObject(lunch);
    expect(await expensesOf("2026-10")).toEqual([created]);
  });

  it("trims the description", async () => {
    const res = await send("POST", "/api/expenses", {
      ...lunch,
      description: "  Lunch  ",
    });

    expect(await res.json()).toMatchObject({ description: "Lunch" });
  });

  it.each([
    ["an empty description", { description: " " }],
    ["a zero amount", { amountCents: 0 }],
    ["an unknown category", { category: "food" }],
    ["an impossible date", { spentOn: "2026-02-30" }],
    ["a date with a time", { spentOn: "2026-10-03T10:00:00Z" }],
  ])("rejects %s", async (_label, overrides) => {
    const res = await send("POST", "/api/expenses", { ...lunch, ...overrides });

    expect(res.status).toBe(400);
    expect(await expensesOf("2026-10")).toEqual([]);
  });
});

describe("PUT /api/expenses/:id", () => {
  it("replaces the expense", async () => {
    const created = await (await send("POST", "/api/expenses", lunch)).json();
    const res = await send("PUT", `/api/expenses/${created.id}`, {
      description: "Pharmacy",
      amountCents: 6240,
      category: "health",
      spentOn: "2026-09-28",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: created.id,
      description: "Pharmacy",
      amountCents: 6240,
      category: "health",
      spentOn: "2026-09-28",
    });
    expect(await expensesOf("2026-10")).toEqual([]);
  });

  it("rejects an incomplete body", async () => {
    const created = await (await send("POST", "/api/expenses", lunch)).json();
    const res = await send("PUT", `/api/expenses/${created.id}`, {
      description: "Pharmacy",
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown expense", async () => {
    const res = await send("PUT", "/api/expenses/missing", lunch);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Expense not found" });
  });
});

describe("DELETE /api/expenses/:id", () => {
  it("deletes the expense", async () => {
    const created = await (await send("POST", "/api/expenses", lunch)).json();
    const res = await send("DELETE", `/api/expenses/${created.id}`);

    expect(res.status).toBe(204);
    expect(await expensesOf("2026-10")).toEqual([]);
  });

  it("returns 404 when it was already deleted", async () => {
    const created = await (await send("POST", "/api/expenses", lunch)).json();
    await send("DELETE", `/api/expenses/${created.id}`);
    const res = await send("DELETE", `/api/expenses/${created.id}`);

    expect(res.status).toBe(404);
  });
});
