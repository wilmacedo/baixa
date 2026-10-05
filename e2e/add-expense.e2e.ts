import { expect, test } from "./fixtures";

test("adding an expense with the keyboard only", async ({ page, app }) => {
  app.expenses.create({
    description: "Farmácia",
    amountCents: 3000,
    category: "health",
    spentOn: "2026-09-10",
  });

  await page.goto(app.url);
  await expect(page.getByText("Nenhum gasto avulso em outubro.")).toBeVisible();

  await page.keyboard.press("6");
  const amount = page.getByLabel("Valor do gasto");
  await expect(amount).toHaveValue("6");
  await page.keyboard.type("2,40");
  await expect(amount).toHaveValue("62,40");

  await page.keyboard.press("Enter");
  await page.keyboard.type("farm");
  await expect(page.getByText("categoria · sugerida")).toBeVisible();
  await page.keyboard.press("Enter");

  const row = page.getByRole("listitem").filter({ hasText: "Farmácia" });
  await expect(row).toContainText("62,40");
  await expect(row).toContainText("Saúde");
  await expect(page.getByText("Farmácia · R$ 62,40 em Saúde")).toBeVisible();

  await expect
    .poll(() => app.expenses.listForMonth("2026-10"))
    .toMatchObject([
      {
        description: "Farmácia",
        amountCents: 6240,
        category: "health",
        spentOn: "2026-10-05",
      },
    ]);
});

test("refuses an empty amount and keeps the panel open", async ({
  page,
  app,
}) => {
  await page.goto(app.url);
  await page.getByRole("button", { name: "novo gasto" }).first().click();
  await page.getByLabel("Valor do gasto").press("Enter");

  await expect(page.getByText("Digite um valor maior que zero.")).toBeVisible();
  expect(app.expenses.listForMonth("2026-10")).toEqual([]);
});
