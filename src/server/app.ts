import { Hono } from "hono";
import { createConversations } from "./chat/conversations";
import type { ChatEngine } from "./chat/engine";
import type { Db } from "./db";
import { createEntries } from "./entries";
import { createExpenses } from "./expenses";
import { handleError } from "./http";
import { chatRoutes } from "./routes/chat";
import { expenseRoutes } from "./routes/expenses";
import { monthRoutes } from "./routes/months";
import { templateRoutes } from "./routes/templates";
import { createTemplates } from "./templates";

export interface AppOptions {
  chatEngine?: ChatEngine;
}

export function createApp(db: Db, options: AppOptions = {}) {
  const templates = createTemplates(db);
  const entries = createEntries(db);
  const expenses = createExpenses(db);
  const conversations = createConversations(db);

  const app = new Hono();
  app.onError(handleError);

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.route("/api/templates", templateRoutes(templates));
  app.route("/api/expenses", expenseRoutes(expenses));
  app.route("/api/months", monthRoutes({ templates, entries, expenses }));
  app.route("/api/chat", chatRoutes(conversations, options.chatEngine));
  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

  return app;
}
