import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "../db";
import { createTemplates } from "../templates";
import { listenMcp, MCP_PATH } from "./mcp";
import { createQueries } from "./queries";

let db: Db;
let client: Client;
let url: URL;
let close: () => void;

beforeEach(async () => {
  db = openDatabase(":memory:");
  createTemplates(db).create({
    name: "Rent",
    amountCents: 300000,
    dueDay: 5,
    group: "fixed",
  });
  const server = await listenMcp(
    createQueries(db, () => new Date(2026, 9, 15)),
    0,
  );
  url = new URL(
    `http://127.0.0.1:${(server.address() as AddressInfo).port}${MCP_PATH}`,
  );
  client = new Client({ name: "test", version: "0" });
  await client.connect(new StreamableHTTPClientTransport(url));
  close = () => server.close();
});

afterEach(async () => {
  await client.close();
  close();
  db.close();
});

const text = (result: unknown) =>
  (result as { content: { text: string }[] }).content[0]?.text ?? "";

describe("mcp server", () => {
  it("lists the read-only tools", async () => {
    const { tools } = await client.listTools();

    expect(tools.map((t) => t.name).sort()).toEqual([
      "bill_history",
      "list_bills",
      "list_expenses",
      "list_recurring",
      "month_summary",
      "run_sql",
      "spending_trend",
      "today",
    ]);
  });

  it("answers a tool call with the same numbers as the app", async () => {
    const result = await client.callTool({
      name: "month_summary",
      arguments: { month: "2026-10" },
    });

    expect(JSON.parse(text(result)).pending.text).toBe("R$ 3.000,00");
  });

  it("reports a bad argument as a tool error the model can read", async () => {
    const result = await client.callTool({
      name: "month_summary",
      arguments: { month: "October" },
    });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain("not a month");
  });

  it("refuses writes through run_sql", async () => {
    const result = await client.callTool({
      name: "run_sql",
      arguments: { sql: "DELETE FROM templates" },
    });

    expect(result.isError).toBe(true);
    expect(createTemplates(db).list()).toHaveLength(1);
  });

  it("only serves POST on the mcp path", async () => {
    expect((await fetch(url)).status).toBe(405);
    expect(
      (await fetch(new URL("/other", url), { method: "POST" })).status,
    ).toBe(404);
  });
});
