import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { createClaudeEngine } from "../src/server/chat/engine";
import { listenMcp, MCP_PATH } from "../src/server/chat/mcp";
import { SYSTEM_PROMPT } from "../src/server/chat/prompt";
import { createQueries } from "../src/server/chat/queries";
import { openDatabase } from "../src/server/db";
import { addMonths } from "../src/shared/months";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? (args[index + 1] ?? fallback) : fallback;
};

const source = option("db", process.env.DATABASE_PATH ?? "data/baixa.db");
const model = option("model", "sonnet");

const dir = mkdtempSync(join(tmpdir(), "baixa-eval-"));
const copy = join(dir, "baixa.db");
const original = new Database(source, { readonly: true, fileMustExist: true });
await original.backup(copy);
original.close();

const db = openDatabase(copy);
const queries = createQueries(db);
const server = await listenMcp(queries, 0);
const port = (server.address() as { port: number }).port;

const engine = createClaudeEngine({
  command: process.env.BAIXA_CHAT_CLI ?? "claude",
  model,
  systemPrompt: SYSTEM_PROMPT,
  mcpUrl: `http://127.0.0.1:${port}${MCP_PATH}`,
  cwd: dir,
  timeoutMs: 180_000,
});

interface Case {
  question: string;
  expected: (string | string[])[];
}

const current = queries.today().month;
const previous = addMonths(current, -1);
const thisMonth = queries.monthSummary(current);
const lastMonth = queries.monthSummary(previous);
const bills = queries.listBills(current);

const cases: Case[] = [
  {
    question: "Quanto falta pagar neste mês?",
    expected: [thisMonth.pending.text],
  },
  {
    question: "Quanto falta pagar nos cartões neste mês?",
    expected: [thisMonth.groups.cards.pending.text],
  },
  {
    question: "Quantas contas estão atrasadas neste mês?",
    expected: [
      thisMonth.late === 0 ? ["0", "nenhuma"] : String(thisMonth.late),
    ],
  },
];

if (lastMonth.hasBills) {
  cases.push(
    {
      question: `Quanto paguei de contas em ${previous}?`,
      expected: [lastMonth.paid.text],
    },
    {
      question: `Quanto gastei com despesas avulsas em ${previous}?`,
      expected: [lastMonth.oneOffExpenses.total.text],
    },
  );
}

const fixed = bills
  .filter((b) => b.group === "fixed")
  .sort((a, b) => b.amount.cents - a.amount.cents)[0];
if (fixed) {
  cases.push({
    question: "Qual é a maior conta fixa deste mês e quanto ela custa?",
    expected: [fixed.name, fixed.amount.text],
  });
}

const history = queries
  .listRecurring()
  .map((t) => queries.billHistory(t.name)[0])
  .filter((h) => h?.months.some((m) => m.month === previous))
  .at(0);
const entry = history?.months.find((m) => m.month === previous);
if (history && entry) {
  cases.push({
    question: `Quanto foi a conta ${history.name} em ${previous}?`,
    expected: [entry.amount.text],
  });
}

const strip = (text: string) => text.replace(/R\$\s?/g, "").toLowerCase();

let passed = 0;
for (const { question, expected } of cases) {
  const started = Date.now();
  let answer = "";
  let failure = "";
  for await (const event of engine.reply({
    prompt: question,
    sessionId: crypto.randomUUID(),
    resume: false,
  })) {
    if (event.type === "delta") answer += event.text;
    if (event.type === "error") failure = event.message;
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const missing = expected.filter(
    (e) => ![e].flat().some((option) => strip(answer).includes(strip(option))),
  );
  const ok = !failure && missing.length === 0;
  if (ok) passed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} (${seconds}s) ${question}`);
  if (!ok) {
    console.log(`  expected: ${expected.flat().join(" | ")}`);
    console.log(`  answer: ${failure || answer.replace(/\s+/g, " ").trim()}`);
  }
}

console.log(`\n${passed}/${cases.length} correct with model "${model}".`);
server.close();
db.close();
rmSync(dir, { recursive: true, force: true });
process.exit(passed === cases.length ? 0 : 1);
