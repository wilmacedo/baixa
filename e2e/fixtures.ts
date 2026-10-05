import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { test as base, expect } from "@playwright/test";
import { createApp } from "../src/server/app";
import type { ChatEngine, ChatErrorCode } from "../src/server/chat/engine";
import { type Db, openDatabase } from "../src/server/db";
import { createEntries } from "../src/server/entries";
import { createExpenses } from "../src/server/expenses";
import { createTemplates } from "../src/server/templates";
import { serveWeb } from "../src/server/web";

export const TODAY = new Date(2026, 9, 5, 10, 0);

export interface FakeChat {
  available: boolean;
  reply: string;
  failWith: ChatErrorCode | null;
  questions: string[];
}

interface Fixtures {
  app: {
    url: string;
    chat: FakeChat;
    db: Db;
    templates: ReturnType<typeof createTemplates>;
    entries: ReturnType<typeof createEntries>;
    expenses: ReturnType<typeof createExpenses>;
  };
}

export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    const db = openDatabase(":memory:");
    const chat: FakeChat = {
      available: false,
      reply: "Falta **R$ 10,00** neste mês.",
      failWith: null,
      questions: [],
    };
    const chatEngine: ChatEngine = {
      available: async () => chat.available,
      async *reply({ prompt }) {
        chat.questions.push(prompt);
        if (chat.failWith) {
          yield { type: "error", code: chat.failWith, message: "x" };
          return;
        }
        yield { type: "tool", name: "mcp__baixa__today" };
        for (const word of chat.reply.split(/(?<= )/)) {
          yield { type: "delta", text: word };
        }
        yield { type: "done" };
      },
    };
    const app = createApp(db, { chatEngine });
    serveWeb(app, "dist/web");

    const server = serve({ fetch: app.fetch, port: 0 });
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;

    await page.clock.setFixedTime(TODAY);

    await use({
      url: `http://localhost:${port}`,
      chat,
      db,
      templates: createTemplates(db),
      entries: createEntries(db),
      expenses: createExpenses(db),
    });

    server.close();
    db.close();
  },
});

export { expect };
