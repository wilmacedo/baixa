import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { openDatabase } from "../src/server/db";
import { createEntries } from "../src/server/entries";
import { createExpenses } from "../src/server/expenses";
import { createTemplates } from "../src/server/templates";
import { addDays, isoDate } from "../src/shared/dates";
import { addMonths, todayOf } from "../src/shared/months";
import type { Category, Group } from "../src/shared/types";

const databasePath = process.env.DATABASE_PATH ?? "data/baixa.db";
mkdirSync(dirname(databasePath), { recursive: true });
const db = openDatabase(databasePath);

const { n: existing } = db
  .prepare("SELECT COUNT(*) AS n FROM templates")
  .get() as { n: number };
if (existing !== 0) {
  console.error(`${databasePath} already has data. Refusing to seed it.`);
  process.exit(1);
}

const bills: Array<[string, number, number, Group]> = [
  ["Financiamento do carro", 125000, 3, "fixed"],
  ["Energia", 32000, 5, "fixed"],
  ["Condomínio", 65000, 9, "fixed"],
  ["IPTU", 14000, 9, "fixed"],
  ["Telefone", 12000, 9, "fixed"],
  ["Internet", 13000, 9, "fixed"],
  ["Aluguel", 180000, 10, "fixed"],
  ["Plano de saúde", 41000, 10, "fixed"],
  ["Contabilidade", 30000, 15, "fixed"],
  ["Diarista", 15000, 15, "fixed"],
  ["Nuvem", 12000, 1, "charges"],
  ["Streaming", 4500, 2, "charges"],
  ["Música", 2500, 3, "charges"],
  ["Academia", 25000, 5, "charges"],
  ["Seguro residencial", 8000, 5, "charges"],
  ["Parcelamento A", 40000, 20, "charges"],
  ["Parcelamento B", 35000, 20, "charges"],
  ["Cartão A", 110000, 14, "cards"],
  ["Cartão B", 130000, 14, "cards"],
  ["Cartão C", 40000, 14, "cards"],
  ["Cartão D", 980000, 14, "cards"],
];

const expenses: Array<[string, number, Category, number]> = [
  ["Mercado", 31890, "groceries", -3],
  ["Farmácia", 6240, "health", -2],
  ["Uber", 2290, "transport", -1],
  ["Padaria", 1850, "groceries", 0],
];

const templates = createTemplates(db);
const entries = createEntries(db);
const spending = createExpenses(db);

const today = isoDate(new Date());
const { month: currentMonth, day: currentDay } = todayOf(new Date());
const created = bills.map(([name, amountCents, dueDay, group]) =>
  templates.create({ name, amountCents, dueDay, group }),
);

for (let back = 4; back >= 1; back -= 1) {
  const month = addMonths(currentMonth, -back);
  created.forEach((template, index) => {
    const wobble = ((index * 7 + back * 13) % 11) - 5;
    entries.save(month, {
      templateId: template.id,
      amountCents: Math.round(template.amountCents * (1 + wobble / 100)),
      paidAt: `${month}-${String(Math.max(1, template.dueDay - 1)).padStart(2, "0")}`,
    });
  });
}

const leftLate = "Financiamento do carro";

created.forEach((template) => {
  if (template.dueDay > currentDay || template.name === leftLate) return;
  entries.save(currentMonth, {
    templateId: template.id,
    amountCents: template.amountCents,
    paidAt: `${currentMonth}-${String(template.dueDay).padStart(2, "0")}`,
  });
});

for (const [description, amountCents, category, offset] of expenses) {
  spending.create({
    description,
    amountCents,
    category,
    spentOn: addDays(today, offset),
  });
}

console.log(`Seeded ${created.length} templates into ${databasePath}`);
