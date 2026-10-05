import { Hono } from "hono";
import type { Expenses } from "../expenses";
import { notFound, readBody } from "../http";
import { expenseInput } from "../schemas";

const HISTORY_LIMIT = 1000;

export function expenseRoutes(expenses: Expenses) {
  const routes = new Hono();

  routes.get("/history", (c) => c.json(expenses.history(HISTORY_LIMIT)));

  routes.post("/", async (c) => {
    const input = await readBody(c, expenseInput);
    return c.json(expenses.create(input), 201);
  });

  routes.put("/:id", async (c) => {
    const input = await readBody(c, expenseInput);
    const replaced = expenses.replace(c.req.param("id"), input);
    if (!replaced) throw notFound("Expense");
    return c.json(replaced);
  });

  routes.delete("/:id", (c) => {
    if (!expenses.delete(c.req.param("id"))) throw notFound("Expense");
    return c.body(null, 204);
  });

  return routes;
}
