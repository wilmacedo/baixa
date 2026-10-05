import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

test("the chat button stays hidden when the assistant is not set up", async ({
  page,
  app,
}) => {
  await page.goto(app.url);

  await expect(
    page.getByRole("button", { name: "Abrir assistente" }),
  ).toHaveCount(0);
  await page.keyboard.press("c");
  await expect(page.getByRole("dialog", { name: "Assistente" })).toHaveCount(0);
});

const ready = (page: Page) =>
  expect(page.getByRole("button", { name: "Abrir assistente" })).toBeVisible();

const openWithKey = async (page: Page) => {
  const panel = page.getByRole("dialog", { name: "Assistente" });
  await ready(page);
  await expect(async () => {
    if (!(await panel.isVisible())) await page.keyboard.press("c");
    await expect(panel).toBeVisible({ timeout: 500 });
  }).toPass();
};

test.describe("on desktop", () => {
  test.beforeEach(({ app }) => {
    app.chat.available = true;
  });

  test("asking a suggested question shows the formatted answer", async ({
    page,
    app,
  }) => {
    await page.goto(app.url);
    await page.getByRole("button", { name: "Abrir assistente" }).click();

    const panel = page.getByRole("dialog", { name: "Assistente" });
    await panel
      .getByRole("button", { name: "Quais contas estão atrasadas?" })
      .click();

    await expect(
      panel.locator("strong", { hasText: "R$ 10,00" }),
    ).toBeVisible();
    await expect(
      panel.getByText("Quais contas estão atrasadas?"),
    ).toBeVisible();
    expect(app.chat.questions).toEqual(["Quais contas estão atrasadas?"]);
  });

  test("Enter sends, Shift+Enter breaks the line and the conversation survives a reload", async ({
    page,
    app,
  }) => {
    await page.goto(app.url);
    await openWithKey(page);

    const panel = page.getByRole("dialog", { name: "Assistente" });
    const field = panel.getByLabel("Mensagem para o assistente");
    await field.fill("primeira");
    await field.press("Shift+Enter");
    await field.pressSequentially("segunda");
    await field.press("Enter");

    await expect(panel.locator("strong")).toBeVisible();
    expect(app.chat.questions).toEqual(["primeira\nsegunda"]);

    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);

    await page.reload();
    await openWithKey(page);
    await expect(
      page.getByRole("dialog", { name: "Assistente" }).locator("strong"),
    ).toBeVisible();
  });

  test("the C key does not type into other screens while the chat is open", async ({
    page,
    app,
  }) => {
    await page.goto(app.url);
    await openWithKey(page);
    await page.getByRole("button", { name: "fechar" }).focus();
    await page.keyboard.press("5");

    await expect(page.getByLabel("Descrição")).toHaveCount(0);
  });

  test("a failed reply offers to try again", async ({ page, app }) => {
    app.chat.failWith = "limit";
    await page.goto(app.url);
    await openWithKey(page);

    const panel = page.getByRole("dialog", { name: "Assistente" });
    await panel.getByLabel("Mensagem para o assistente").fill("oi");
    await panel.getByRole("button", { name: "enviar" }).click();

    await expect(panel.getByRole("alert")).toContainText(
      "limite da sua assinatura",
    );

    app.chat.failWith = null;
    await panel.getByRole("button", { name: "tentar de novo" }).click();
    await expect(panel.locator("strong")).toBeVisible();
  });
});

test.describe("on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the button sits above the bottom bar and opens a full-screen sheet", async ({
    page,
    app,
  }) => {
    app.chat.available = true;
    await page.goto(app.url);

    const button = page.getByRole("button", { name: "Abrir assistente" });
    const bar = page.getByRole("navigation", { name: "Navegação" });
    const buttonBox = await button.boundingBox();
    const barBox = await bar.boundingBox();
    expect((buttonBox?.y ?? 0) + (buttonBox?.height ?? 0)).toBeLessThanOrEqual(
      barBox?.y ?? 0,
    );

    await button.click();
    const sheet = page.getByRole("dialog", { name: "Assistente" });
    await expect(sheet).toBeVisible();
    expect((await sheet.boundingBox())?.width).toBe(390);

    await sheet.getByLabel("Mensagem para o assistente").fill("Quanto falta?");
    await sheet.getByLabel("Mensagem para o assistente").press("Enter");
    await expect(sheet.locator("strong")).toBeVisible();
  });
});
