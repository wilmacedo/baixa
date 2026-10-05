import { createServer, type Server } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { CATEGORIES, GROUPS } from "../../shared/types";
import { type Queries, QueryError } from "./queries";

const month = z.string().describe("Month as YYYY-MM, e.g. 2026-10");
const date = z.string().describe("Date as YYYY-MM-DD");

const ENTRY_RULES =
  "Amounts are in cents (integers) with a ready-made `text`; quote `text` and never add numbers yourself.";

export function createMcpServer(queries: Queries) {
  const server = new McpServer({ name: "baixa", version: "1.0.0" });

  const tool = <Shape extends z.ZodRawShape>(
    name: string,
    description: string,
    inputSchema: Shape,
    run: (input: z.infer<z.ZodObject<Shape>>) => unknown,
  ) =>
    server.registerTool(name, { description, inputSchema }, (async (
      input: z.infer<z.ZodObject<Shape>>,
    ) => {
      try {
        return {
          content: [{ type: "text", text: JSON.stringify(run(input)) }],
        };
      } catch (error) {
        if (!(error instanceof QueryError)) throw error;
        return {
          isError: true,
          content: [{ type: "text", text: error.message }],
        };
      }
    }) as never);

  tool(
    "today",
    "Today's date and current month. Call it before reasoning about 'this month', 'late' or 'last month'.",
    {},
    () => queries.today(),
  );

  tool(
    "month_summary",
    `Totals of one month: pending and paid bills per group (fixed, charges, cards), late count and one-off expenses by category. Same numbers as the app screen. ${ENTRY_RULES}`,
    { month },
    ({ month }) => queries.monthSummary(month),
  );

  tool(
    "list_bills",
    `Every bill of a month with amount, due day, status (paid, pending, today, late) and payment date. ${ENTRY_RULES}`,
    {
      month,
      group: z.enum(GROUPS).optional(),
      status: z.enum(["paid", "pending", "today", "late"]).optional(),
    },
    ({ month, group, status }) => queries.listBills(month, { group, status }),
  );

  tool(
    "bill_history",
    `Amount and payment of a recurring bill month by month. The name is matched loosely (case and accents ignored) and may match several bills, including inactive ones. ${ENTRY_RULES}`,
    { name: z.string(), from: month.optional(), to: month.optional() },
    ({ name, from, to }) => queries.billHistory(name, from, to),
  );

  tool(
    "list_expenses",
    `One-off expenses (not recurring bills) with totals overall and by category, filtered by date range, category or description text. ${ENTRY_RULES}`,
    {
      from: date.optional(),
      to: date.optional(),
      category: z.enum(CATEGORIES).optional(),
      text: z.string().optional(),
    },
    (filter) => queries.listExpenses(filter),
  );

  tool(
    "spending_trend",
    `Month-by-month totals (bills pending and paid, cards, one-off expenses) for the last N months ending at the current one. ${ENTRY_RULES}`,
    { months: z.number().int().min(1).max(36).optional() },
    ({ months }) => queries.spendingTrend(months),
  );

  tool(
    "list_recurring",
    "The recurring bill templates: default amount (variable bills have none), due day, group, whether the card charges it automatically, and whether it is active.",
    { includeInactive: z.boolean().optional() },
    ({ includeInactive }) => queries.listRecurring(includeInactive),
  );

  tool(
    "run_sql",
    "Read-only SELECT over the SQLite database for questions the other tools cannot answer. Tables: templates(id, name, amount_cents, due_day, group, active, auto_paid, position), entries(month, template_id, amount_cents, paid_at), expenses(id, description, amount_cents, category, spent_on). `entries` only holds months that were edited or paid, the current and future months are generated from `templates`, so prefer the other tools for them. Returns at most 200 rows.",
    { sql: z.string() },
    ({ sql }) => queries.runSql(sql),
  );

  return server;
}

export const MCP_PATH = "/mcp";

export function listenMcp(
  queries: Queries,
  port: number,
  host = "127.0.0.1",
): Promise<Server> {
  const http = createServer(async (req, res) => {
    if (req.url !== MCP_PATH) {
      res.writeHead(404).end();
      return;
    }
    if (req.method !== "POST") {
      res.writeHead(405, { allow: "POST" }).end();
      return;
    }

    const server = createMcpServer(queries);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("MCP request failed", error);
      if (!res.headersSent) res.writeHead(500).end();
    }
  });

  return new Promise((resolve, reject) => {
    http.once("error", reject);
    http.listen(port, host, () => resolve(http));
  });
}
