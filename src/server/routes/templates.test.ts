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

const rent = { name: "Rent", amountCents: 100000, dueDay: 10, group: "fixed" };

describe("GET /api/templates", () => {
  it("starts empty", async () => {
    const res = await send("GET", "/api/templates");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/templates", () => {
  it("creates a template and lists it", async () => {
    const res = await send("POST", "/api/templates", rent);
    const created = await res.json();

    expect(res.status).toBe(201);
    expect(created).toMatchObject({ ...rent, active: true, position: 1 });
    expect(await (await send("GET", "/api/templates")).json()).toEqual([
      created,
    ]);
  });

  it("trims the name", async () => {
    const res = await send("POST", "/api/templates", {
      ...rent,
      name: "  Rent  ",
    });

    expect(await res.json()).toMatchObject({ name: "Rent" });
  });

  it.each([
    ["an empty name", { name: "  " }],
    ["a zero amount", { amountCents: 0 }],
    ["a fractional amount", { amountCents: 10.5 }],
    ["a due day of 32", { dueDay: 32 }],
    ["an unknown group", { group: "misc" }],
  ])("rejects %s", async (_label, overrides) => {
    const res = await send("POST", "/api/templates", { ...rent, ...overrides });

    expect(res.status).toBe(400);
    expect(await (await send("GET", "/api/templates")).json()).toEqual([]);
  });

  it("rejects a missing field", async () => {
    const { dueDay: _dueDay, ...incomplete } = rent;
    const res = await send("POST", "/api/templates", incomplete);

    expect(res.status).toBe(400);
  });
});

describe("PUT /api/templates/:id", () => {
  it("updates the given fields only", async () => {
    const created = await (await send("POST", "/api/templates", rent)).json();
    const res = await send("PUT", `/api/templates/${created.id}`, {
      amountCents: 105000,
      active: false,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ...created,
      amountCents: 105000,
      active: false,
    });
  });

  it("rejects invalid values", async () => {
    const created = await (await send("POST", "/api/templates", rent)).json();
    const res = await send("PUT", `/api/templates/${created.id}`, {
      dueDay: 0,
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown template", async () => {
    const res = await send("PUT", "/api/templates/missing", { name: "x" });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Template not found" });
  });
});
