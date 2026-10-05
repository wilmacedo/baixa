import { expect, test } from "./fixtures";

test("switching months shows each month's own data", async ({ page, app }) => {
  const rent = app.templates.create({
    name: "Aluguel",
    amountCents: 180000,
    dueDay: 10,
    group: "fixed",
  });
  app.entries.save("2026-09", {
    templateId: rent.id,
    amountCents: 170000,
    paidAt: "2026-09-10",
  });
  app.expenses.create({
    description: "Padaria",
    amountCents: 1850,
    category: "groceries",
    spentOn: "2026-09-12",
  });

  await page.goto(app.url);
  await expect(
    page.getByRole("heading", { level: 1, name: "outubro" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Contas fixas").getByText("1.800,00"),
  ).toBeVisible();

  await page.keyboard.press("[");
  await expect(
    page.getByRole("heading", { level: 1, name: "setembro" }),
  ).toBeVisible();
  await expect(page.getByText("Nenhum gasto avulso em setembro.")).toBeHidden();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Padaria" }),
  ).toBeVisible();
  await expect(page.getByText("Tudo pago neste grupo.")).toHaveCount(1);

  await page.getByRole("button", { name: "voltar para outubro" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "outubro" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Padaria" }),
  ).toBeHidden();
});

test("future months are generated from the recurring bills", async ({
  page,
  app,
}) => {
  app.templates.create({
    name: "Aluguel",
    amountCents: 180000,
    dueDay: 10,
    group: "fixed",
  });

  await page.goto(app.url);
  await expect(
    page.getByRole("heading", { level: 1, name: "outubro" }),
  ).toBeVisible();
  await page.keyboard.press("]");

  await expect(
    page.getByRole("heading", { level: 1, name: "novembro" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Contas fixas").getByText("1.800,00"),
  ).toBeVisible();
  expect(app.entries.listForMonth("2026-11")).toEqual([]);
});
