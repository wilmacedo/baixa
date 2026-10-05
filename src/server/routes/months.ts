import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { isMonthKey, type MonthKey } from "../../shared/months";
import type { Entries } from "../entries";
import type { Expenses } from "../expenses";
import { notFound, readBody } from "../http";
import { entryInput } from "../schemas";
import type { Templates } from "../templates";

interface Repositories {
  templates: Templates;
  entries: Entries;
  expenses: Expenses;
}

function parseMonth(value: string): MonthKey {
  if (!isMonthKey(value)) {
    throw new HTTPException(400, { message: "Month must look like 2026-10" });
  }
  return value;
}

export function monthRoutes({ templates, entries, expenses }: Repositories) {
  const routes = new Hono();

  routes.get("/:month", (c) => {
    const month = parseMonth(c.req.param("month"));
    return c.json({
      month,
      templates: templates.list(),
      entries: entries.listForMonth(month),
      expenses: expenses.listForMonth(month),
    });
  });

  routes.put("/:month/entries/:templateId", async (c) => {
    const month = parseMonth(c.req.param("month"));
    const templateId = c.req.param("templateId");
    const input = await readBody(c, entryInput);
    if (!templates.get(templateId)) throw notFound("Template");
    return c.json(entries.save(month, { templateId, ...input }));
  });

  return routes;
}
