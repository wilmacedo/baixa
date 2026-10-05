import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { openDatabase } from "../src/server/db";
import { formatCents } from "../src/shared/money";
import { applyPlan } from "./import/apply";
import { parseCsv } from "./import/csv";
import { buildPlan, type TabInput } from "./import/plan";
import { monthFromTabName } from "./import/sheet-values";
import { parseTab } from "./import/tab";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const directory = args.find((arg) => !arg.startsWith("--"));

if (!directory) {
  console.error("Usage: pnpm import-sheet <folder with csv files> [--apply]");
  process.exit(1);
}

const tabs: TabInput[] = [];
for (const file of readdirSync(directory)
  .filter((f) => f.endsWith(".csv"))
  .sort()) {
  const tabName = basename(file, ".csv").split(" - ").at(-1) ?? file;
  const month = monthFromTabName(tabName);
  if (!month) {
    console.log(`Skipping ${file}: "${tabName}" is not a month.`);
    continue;
  }
  tabs.push({
    month,
    tab: parseTab(parseCsv(readFileSync(join(directory, file), "utf8"))),
  });
}

const plan = buildPlan(tabs);

console.log(
  "\nMonth     Pending         Paid            Cards           One-offs",
);
for (const m of plan.months) {
  const cells = [m.pendingCents, m.paidCents, m.cardsCents, m.expensesCents]
    .map((cents) => formatCents(cents).padStart(14))
    .join("  ");
  console.log(`${m.month}  ${cells}`);
}
console.log(
  `\n${plan.templates.length} recurring bills, ${plan.entries.length} monthly entries, ${plan.expenses.length} one-off expenses.`,
);
for (const warning of plan.warnings) console.log(`warning: ${warning}`);

if (!apply) {
  console.log(
    "\nDry run. Compare the totals above with the spreadsheet, then run again with --apply.",
  );
  process.exit(0);
}

const databasePath = process.env.DATABASE_PATH ?? "data/baixa.db";
mkdirSync(dirname(databasePath), { recursive: true });
try {
  const counts = applyPlan(openDatabase(databasePath), plan);
  console.log(`\nImported into ${databasePath}:`, counts);
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
