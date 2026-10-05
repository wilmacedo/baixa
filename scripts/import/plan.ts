import { detectCategory, normalizeText } from "../../src/shared/category";
import { parseIsoDate } from "../../src/shared/dates";
import type { MonthKey } from "../../src/shared/months";
import type { Category, Group } from "../../src/shared/types";
import type { ParsedTab, SheetBill } from "./tab";

export interface TabInput {
  month: MonthKey;
  tab: ParsedTab;
}

export interface PlannedTemplate {
  key: string;
  name: string;
  group: Group;
  amountCents: number;
  dueDay: number;
  active: boolean;
}

export interface PlannedEntry {
  templateKey: string;
  month: MonthKey;
  amountCents: number;
  paidAt: string | null;
}

export interface PlannedExpense {
  description: string;
  amountCents: number;
  category: Category;
  spentOn: string;
}

export interface MonthSummary {
  month: MonthKey;
  pendingCents: number;
  paidCents: number;
  cardsCents: number;
  expensesCents: number;
}

export interface ImportPlan {
  templates: PlannedTemplate[];
  entries: PlannedEntry[];
  expenses: PlannedExpense[];
  months: MonthSummary[];
  warnings: string[];
}

const CATEGORY_WORDS: Record<string, Category> = {
  casa: "home",
  mercado: "groceries",
  saude: "health",
  transporte: "transport",
  lazer: "leisure",
  outros: "other",
};

const pad = (n: number) => String(n).padStart(2, "0");

export function mapCategory(text: string, description: string): Category {
  return (
    CATEGORY_WORDS[normalizeText(text)] ??
    detectCategory(description) ??
    "other"
  );
}

interface Seen {
  name: string;
  group: Group;
  amountCents: number | null;
  dueDay: number | null;
  lastMonth: MonthKey;
}

const keyOf = (bill: SheetBill) => `${bill.group}:${normalizeText(bill.name)}`;

export function buildPlan(
  inputs: readonly TabInput[],
  model?: ParsedTab,
): ImportPlan {
  const tabs = [...inputs].sort((a, b) => a.month.localeCompare(b.month));
  const latest = tabs.at(-1)?.month;
  const warnings: string[] = [];

  const seen = new Map<string, Seen>();
  for (const { month, tab } of tabs) {
    for (const bill of tab.bills) {
      const key = keyOf(bill);
      const previous = seen.get(key);
      seen.set(key, {
        name: bill.name,
        group: bill.group,
        amountCents: bill.amountCents || (previous?.amountCents ?? null),
        dueDay: bill.paidOn
          ? parseIsoDate(bill.paidOn).day
          : (previous?.dueDay ?? null),
        lastMonth: month,
      });
    }
  }

  const modelAmounts = new Map(
    (model?.bills ?? []).map((bill) => [keyOf(bill), bill.amountCents ?? 0]),
  );
  for (const bill of model?.bills ?? []) {
    const key = keyOf(bill);
    if (!seen.has(key)) {
      seen.set(key, {
        name: bill.name,
        group: bill.group,
        amountCents: null,
        dueDay: null,
        lastMonth: latest as MonthKey,
      });
    }
  }

  const templates: PlannedTemplate[] = [];
  for (const [key, info] of seen) {
    const inModel = modelAmounts.has(key);
    if (!inModel && !info.amountCents) {
      warnings.push(`Skipped "${info.name}": it never had an amount.`);
      continue;
    }
    if (info.dueDay === null) {
      warnings.push(`"${info.name}" has no payment date, so its due day is 1.`);
    }
    templates.push({
      key,
      name: info.name,
      group: info.group,
      amountCents: inModel
        ? (modelAmounts.get(key) ?? 0)
        : (info.amountCents ?? 0),
      dueDay: info.dueDay ?? 1,
      active: model ? inModel : info.lastMonth === latest,
    });
  }
  const byKey = new Map(templates.map((t) => [t.key, t]));

  const entries: PlannedEntry[] = [];
  const expenses: PlannedExpense[] = [];
  const months: MonthSummary[] = [];

  for (const { month, tab } of tabs) {
    const summary: MonthSummary = {
      month,
      pendingCents: 0,
      paidCents: 0,
      cardsCents: 0,
      expensesCents: 0,
    };
    const done = new Set<string>();

    for (const bill of tab.bills) {
      const key = keyOf(bill);
      const template = byKey.get(key);
      if (!template) continue;
      if (done.has(key)) {
        warnings.push(
          `${month}: "${bill.name}" appears twice, the first one was kept.`,
        );
        continue;
      }
      done.add(key);

      const amountCents = bill.amountCents ?? template.amountCents;
      if (amountCents <= 0) continue;
      const dueDay = Math.min(template.dueDay, 28);
      const paidAt = bill.paid
        ? (bill.paidOn ?? `${month}-${pad(dueDay)}`)
        : null;

      entries.push({ templateKey: key, month, amountCents, paidAt });
      if (paidAt) summary.paidCents += amountCents;
      else summary.pendingCents += amountCents;
      if (template.group === "cards") summary.cardsCents += amountCents;
    }

    for (const expense of tab.expenses) {
      if (!expense.amountCents) {
        warnings.push(
          `${month}: skipped "${expense.description}" without an amount.`,
        );
        continue;
      }
      if (!expense.spentOn) {
        warnings.push(
          `${month}: "${expense.description}" has no date, so it was set to day 1.`,
        );
      }
      expenses.push({
        description: expense.description,
        amountCents: expense.amountCents,
        category: mapCategory(expense.categoryText, expense.description),
        spentOn: expense.spentOn ?? `${month}-01`,
      });
      summary.expensesCents += expense.amountCents;
    }

    months.push(summary);
  }

  return { templates, entries, expenses, months, warnings };
}
