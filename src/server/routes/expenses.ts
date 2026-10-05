import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Expenses } from "../expenses";
import { notFound, readBody } from "../http";
import { expenseCreate, expenseInput } from "../schemas";

const HISTORY_LIMIT = 1000;

export function expenseRoutes(expenses: Expenses) {
  const routes = new Hono();

  routes.get("/history", (c) => c.json(expenses.history(HISTORY_LIMIT)));

  routes.post("/", async (c) => {
    const { id, ...input } = await readBody(c, expenseCreate);
    if (id && expenses.get(id)) {
      throw new HTTPException(409, { message: "Expense already exists" });
    }
    return c.json(expenses.create(input, id), 201);
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
