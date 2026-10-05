import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { openDatabase } from "./db";
import { serveWeb } from "./web";

let root: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "baixa-web-"));
  mkdirSync(join(root, "assets"));
  writeFileSync(join(root, "index.html"), "<h1>baixa</h1>");
  writeFileSync(join(root, "assets", "app.js"), "console.log('app')");

  app = createApp(openDatabase(":memory:"));
  serveWeb(app, root);
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("serveWeb", () => {
  it("serves the index page", async () => {
    const res = await app.request("/");

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<h1>baixa</h1>");
  });

  it("serves built assets", async () => {
    const res = await app.request("/assets/app.js");

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("console.log('app')");
  });

  it("falls back to the index page for client-side routes", async () => {
    const res = await app.request("/recurring");

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<h1>baixa</h1>");
  });

  it("keeps the api routes working", async () => {
    const res = await app.request("/api/health");

    expect(await res.json()).toEqual({ ok: true });
  });

  it("answers unknown api routes with a 404 instead of the index page", async () => {
    const res = await app.request("/api/unknown");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
