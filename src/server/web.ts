import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";

export function serveWeb(app: Hono, root: string) {
  app.use("*", serveStatic({ root }));
  app.get("*", serveStatic({ root, path: "index.html" }));
}
