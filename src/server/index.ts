import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { openDatabase } from "./db";

const port = Number(process.env.PORT ?? 3000);
const databasePath = process.env.DATABASE_PATH ?? "data/baixa.db";

mkdirSync(dirname(databasePath), { recursive: true });
const app = createApp(openDatabase(databasePath));

serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`Listening on http://localhost:${port}`);
});
