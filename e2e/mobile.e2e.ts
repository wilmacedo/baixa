import { expect, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

test("adding an expense with the numeric keypad", async ({ page, app }) => {
  await page.goto(app.url);
  await page
    .getByRole("navigation", { name: "Navegação" })
    .getByRole("button", { name: /gasto/ })
    .click();

  for (const key of ["4", "2", "vírgula", "5"]) {
    await page.getByRole("button", { name: key, exact: true }).click();
  }
  await page.getByLabel("Descrição").fill("Café");
  await page.getByRole("button", { name: "lançar R$ 42,50" }).click();

  await expect(page.getByText("Café · R$ 42,50 em Lazer")).toBeVisible();
  await expect
    .poll(() => app.expenses.listForMonth("2026-10"))
    .toMatchObject([
      { description: "Café", amountCents: 4250, category: "leisure" },
    ]);
});

test("the bill list is grouped by how soon each bill is due", async ({
  page,
  app,
}) => {
  app.templates.create({
    name: "Financiamento",
    amountCents: 125000,
    dueDay: 3,
    group: "fixed",
  });
  app.templates.create({
    name: "Internet",
    amountCents: 13000,
    dueDay: 9,
    group: "fixed",
  });
  app.templates.create({
    name: "Contabilidade",
    amountCents: 30000,
    dueDay: 20,
    group: "fixed",
  });

  await page.goto(app.url);

  await expect(page.getByRole("heading", { name: /atrasadas/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /próximos 7 dias/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /mais adiante/ }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /^Internet, R\$ 130,00\. Marcar como paga/ })
    .click();
  await expect(page.getByText("Internet paga · R$ 130,00")).toBeVisible();
});

test("editing a bill opens a sheet with the keypad", async ({ page, app }) => {
  const rent = app.templates.create({
    name: "Aluguel",
    amountCents: 180000,
    dueDay: 10,
    group: "fixed",
  });

  await page.goto(app.url);
  await page
    .getByRole("button", { name: /^Aluguel, dia 10.*Editar valor do mês/ })
    .click();

  await expect(
    page.getByRole("dialog", { name: "Editar lançamento" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "apagar" }).click();
  await page.getByRole("button", { name: "9", exact: true }).click();
  await page.getByRole("button", { name: "salvar" }).click();

  await expect
    .poll(() => app.entries.listForMonth("2026-10")[0]?.amountCents)
    .toBe(180009);
  expect(app.templates.get(rent.id)?.amountCents).toBe(180000);
});
