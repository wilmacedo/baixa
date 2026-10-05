import { expect, test } from "./fixtures";

test("creating a recurring bill makes it appear in the month", async ({
  page,
  app,
}) => {
  await page.goto(app.url);
  await page
    .getByRole("navigation", { name: "Telas" })
    .getByRole("button", { name: /recorrentes/ })
    .click();

  const cards = page.getByRole("region", { name: "Cartões" });
  await cards.getByRole("button", { name: "nova conta" }).click();
  await page.getByPlaceholder("ex.: Academia").fill("Cartão A");
  await page.getByPlaceholder("0,00").pressSequentially("1100");
  await page.getByLabel("dia", { exact: true }).fill("14");
  await page.getByRole("button", { name: "salvar" }).click();

  await expect(
    page.getByText("Cartão A criada · vale a partir de outubro"),
  ).toBeVisible();
  await expect(cards.getByText("Cartão A")).toBeVisible();
  await expect
    .poll(() => app.templates.list())
    .toMatchObject([
      {
        name: "Cartão A",
        amountCents: 110000,
        dueDay: 14,
        group: "cards",
        active: true,
      },
    ]);

  await page.keyboard.press("m");
  await expect(
    page.getByRole("heading", { level: 1, name: "outubro" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /^Cartão A, dia 14, R\$ 1\.100,00, pendente/,
    }),
  ).toBeVisible();
});

test("validates the form before saving", async ({ page, app }) => {
  await page.goto(app.url);
  await expect(
    page.getByRole("heading", { level: 1, name: "outubro" }),
  ).toBeVisible();
  await page.keyboard.press("r");
  await page
    .getByRole("region", { name: "Contas fixas" })
    .getByRole("button", { name: "nova conta" })
    .click();

  await page.getByRole("button", { name: "salvar" }).click();
  await expect(page.getByRole("alert")).toHaveText("Dê um nome para a conta.");

  await page.getByPlaceholder("ex.: Academia").fill("Aluguel");
  await page.getByPlaceholder("0,00").pressSequentially("1800");
  await page.getByRole("button", { name: "salvar" }).click();
  await expect(page.getByRole("alert")).toHaveText("O dia vai de 1 a 31.");
  expect(app.templates.list()).toEqual([]);
});

test("a bill can be saved without a default amount", async ({ page, app }) => {
  await page.goto(app.url);
  await expect(
    page.getByRole("heading", { level: 1, name: "outubro" }),
  ).toBeVisible();
  await page.keyboard.press("r");
  await page
    .getByRole("region", { name: "Cartões" })
    .getByRole("button", { name: "nova conta" })
    .click();

  await page.getByPlaceholder("ex.: Academia").fill("Cartão B");
  await page.getByLabel("dia").fill("14");
  await page.getByRole("button", { name: "salvar" }).click();

  await expect
    .poll(() => app.templates.list())
    .toMatchObject([{ name: "Cartão B", amountCents: 0, group: "cards" }]);
});

test("deactivating a bill removes it from the next months", async ({
  page,
  app,
}) => {
  const gym = app.templates.create({
    name: "Academia",
    amountCents: 25000,
    dueDay: 5,
    group: "charges",
  });

  await page.goto(app.url);
  await expect(
    page.getByRole("heading", { level: 1, name: "outubro" }),
  ).toBeVisible();
  await page.keyboard.press("r");
  await page.getByRole("switch", { name: "Academia ativa" }).uncheck();

  await expect(
    page.getByText("Academia desativada · sai a partir de outubro"),
  ).toBeVisible();
  await expect.poll(() => app.templates.get(gym.id)?.active).toBe(false);

  await page.keyboard.press("m");
  await expect(
    page.getByRole("heading", { level: 1, name: "outubro" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Academia, dia 5/ }),
  ).toBeHidden();
});
