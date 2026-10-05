import { expect, test } from "./fixtures";

test("editing an amount for one month only", async ({ page, app }) => {
  const rent = app.templates.create({
    name: "Aluguel",
    amountCents: 180000,
    dueDay: 10,
    group: "fixed",
  });

  await page.goto(app.url);
  await page
    .getByRole("button", {
      name: /^Aluguel, dia 10, R\$ 1\.800,00.*Editar valor do mês/,
    })
    .click();

  const amount = page.getByLabel("Valor deste mês");
  await expect(page.getByText("só em outubro")).toBeVisible();
  await expect(page.getByText("· igual ao padrão")).toBeVisible();

  await amount.press("Backspace");
  await amount.press("Backspace");
  await page.keyboard.type("50");
  await expect(page.getByText("· +0,50 neste mês")).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Aluguel: R$ 1.800,50 em outubro")).toBeVisible();
  await expect(page.getByText("ajustado")).toBeVisible();
  await expect
    .poll(() => app.entries.listForMonth("2026-10"))
    .toEqual([{ templateId: rent.id, amountCents: 180050, paidAt: null }]);
  expect(app.templates.get(rent.id)?.amountCents).toBe(180000);
});

test("adopting the new amount as the default for the next months", async ({
  page,
  app,
}) => {
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
  await page.getByLabel("Valor deste mês").press("Backspace");
  await page.keyboard.type("9");
  await page.getByLabel(/usar como novo padrão a partir de novembro/).check();
  await page.getByRole("button", { name: "salvar" }).click();

  await expect(page.getByText("e nos próximos")).toBeVisible();
  await expect.poll(() => app.templates.get(rent.id)?.amountCents).toBe(180009);
  expect(app.entries.listForMonth("2026-10")[0]?.amountCents).toBe(180009);
});

test("cancelling an edit changes nothing", async ({ page, app }) => {
  app.templates.create({
    name: "Aluguel",
    amountCents: 180000,
    dueDay: 10,
    group: "fixed",
  });

  await page.goto(app.url);
  await page
    .getByRole("button", { name: /^Aluguel, dia 10.*Editar valor do mês/ })
    .click();
  await page.keyboard.type("5");
  await page.keyboard.press("Escape");

  await expect(page.getByLabel("Valor deste mês")).toBeHidden();
  expect(app.entries.listForMonth("2026-10")).toEqual([]);
});
