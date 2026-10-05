import { expect, test } from "./fixtures";

test("paying a bill updates the total and can be undone", async ({
  page,
  app,
}) => {
  const rent = app.templates.create({
    name: "Aluguel",
    amountCents: 180000,
    dueDay: 10,
    group: "fixed",
  });
  app.templates.create({
    name: "Internet",
    amountCents: 13000,
    dueDay: 9,
    group: "fixed",
  });

  await page.goto(app.url);
  const remaining = (amount: string) =>
    page.getByRole("status").filter({ hasText: `Falta pagar R$ ${amount}` });
  await expect(remaining("1.930,00")).toBeVisible();

  await page
    .getByRole("button", { name: /^Aluguel, R\$ 1\.800,00\. Marcar como paga/ })
    .click();

  await expect(page.getByText("Aluguel paga · R$ 1.800,00")).toBeVisible();
  await expect(remaining("130,00")).toBeVisible();
  await expect
    .poll(() => app.entries.listForMonth("2026-10"))
    .toEqual([
      { templateId: rent.id, amountCents: 180000, paidAt: "2026-10-05" },
    ]);

  await page.keyboard.press("z");

  await expect(remaining("1.930,00")).toBeVisible();
  await expect
    .poll(() => app.entries.listForMonth("2026-10")[0]?.paidAt)
    .toBeNull();
});
