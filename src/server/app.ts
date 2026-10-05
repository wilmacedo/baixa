import { Hono } from "hono";
import type { Db } from "./db";
import { handleError } from "./http";
import { templateRoutes } from "./routes/templates";
import { createTemplates } from "./templates";

export function createApp(db: Db) {
  const app = new Hono();
  app.onError(handleError);

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.route("/api/templates", templateRoutes(createTemplates(db)));

  return app;
}
