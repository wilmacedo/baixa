import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { handleError, notFound, readBody } from "./http";

const schema = z.object({ amount: z.number().int().positive() });

const app = new Hono();
app.onError(handleError);
app.post("/echo", async (c) => c.json(await readBody(c, schema)));
app.get("/missing", () => {
  throw notFound("Thing");
});
app.get("/boom", () => {
  throw new Error("secret details");
});

const post = (body: string) =>
  app.request("/echo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

describe("readBody", () => {
  it("returns the parsed body", async () => {
    const res = await post(JSON.stringify({ amount: 5 }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ amount: 5 });
  });

  it("rejects a body that is not JSON", async () => {
    const res = await post("{nope");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Request body must be valid JSON",
    });
  });

  it("rejects a body that does not match the schema", async () => {
    const res = await post(JSON.stringify({ amount: -1 }));
    const { error } = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(error).toContain("amount");
  });
});

describe("handleError", () => {
  it("maps a not found error to a 404 response", async () => {
    const res = await app.request("/missing");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Thing not found" });
  });

  it("hides the details of unexpected errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await app.request("/boom");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
