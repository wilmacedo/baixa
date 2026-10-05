import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { test as base, expect } from "@playwright/test";
import { createApp } from "../src/server/app";
import { type Db, openDatabase } from "../src/server/db";
import { createEntries } from "../src/server/entries";
import { createExpenses } from "../src/server/expenses";
import { createTemplates } from "../src/server/templates";
import { serveWeb } from "../src/server/web";

export const TODAY = new Date(2026, 9, 5, 10, 0);

interface Fixtures {
  app: {
    url: string;
    db: Db;
    templates: ReturnType<typeof createTemplates>;
    entries: ReturnType<typeof createEntries>;
    expenses: ReturnType<typeof createExpenses>;
  };
}

export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    const db = openDatabase(":memory:");
    const app = createApp(db);
    serveWeb(app, "dist/web");

    const server = serve({ fetch: app.fetch, port: 0 });
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;

    await page.clock.setFixedTime(TODAY);

    await use({
      url: `http://localhost:${port}`,
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
