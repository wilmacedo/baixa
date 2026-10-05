import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { openDatabase } from "./db";
import { serveWeb } from "./web";

const port = Number(process.env.PORT ?? 3000);
const databasePath = process.env.DATABASE_PATH ?? "data/baixa.db";
const webRoot = process.env.WEB_ROOT ?? "dist/web";

mkdirSync(dirname(databasePath), { recursive: true });
const app = createApp(openDatabase(databasePath));
serveWeb(app, webRoot);

serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`Listening on http://localhost:${port}`);
});
