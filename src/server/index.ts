import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createClaudeEngine } from "./chat/engine";
import { listenMcp, MCP_PATH } from "./chat/mcp";
import { SYSTEM_PROMPT } from "./chat/prompt";
import { createQueries } from "./chat/queries";
import { openDatabase } from "./db";
import { serveWeb } from "./web";

const port = Number(process.env.PORT ?? 3000);
const mcpPort = Number(process.env.MCP_PORT ?? 3001);
const databasePath = process.env.DATABASE_PATH ?? "data/baixa.db";
const webRoot = process.env.WEB_ROOT ?? "dist/web";

mkdirSync(dirname(databasePath), { recursive: true });
const db = openDatabase(databasePath);

async function startChat() {
  try {
    await listenMcp(createQueries(db), mcpPort);
  } catch (error) {
    console.error(
      `Chat disabled: the MCP port ${mcpPort} is not available.`,
      error,
    );
    return undefined;
  }

  const cwd = join(tmpdir(), "baixa-chat");
  mkdirSync(cwd, { recursive: true });
  return createClaudeEngine({
    command: process.env.BAIXA_CHAT_CLI ?? "claude",
    model: process.env.BAIXA_CHAT_MODEL ?? "sonnet",
    systemPrompt: SYSTEM_PROMPT,
    mcpUrl: `http://127.0.0.1:${mcpPort}${MCP_PATH}`,
    cwd,
    timeoutMs: 120_000,
  });
}

const app = createApp(db, { chatEngine: await startChat() });
serveWeb(app, webRoot);

serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`Listening on http://localhost:${port}`);
});
