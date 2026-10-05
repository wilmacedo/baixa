import { Hono } from "hono";
import type { Db } from "./db";
import { createEntries } from "./entries";
import { createExpenses } from "./expenses";
import { handleError } from "./http";
import { monthRoutes } from "./routes/months";
import { templateRoutes } from "./routes/templates";
import { createTemplates } from "./templates";

export function createApp(db: Db) {
  const templates = createTemplates(db);
  const entries = createEntries(db);
  const expenses = createExpenses(db);

  const app = new Hono();
  app.onError(handleError);

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.route("/api/templates", templateRoutes(templates));
  app.route("/api/months", monthRoutes({ templates, entries, expenses }));

  return app;
}
