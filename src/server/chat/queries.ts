import type Database from "better-sqlite3";
import { normalizeText } from "../../shared/category";
import { isoDate } from "../../shared/dates";
import type { EntryStatus } from "../../shared/entry-status";
import { resolveEntries } from "../../shared/generate-month";
import { buildBills, summarize } from "../../shared/ledger";
import { formatCents } from "../../shared/money";
import {
  addMonths,
  isMonthKey,
  type MonthKey,
  type Today,
  todayOf,
} from "../../shared/months";
import { type Category, GROUPS, type Group } from "../../shared/types";
import type { Db } from "../db";
import { createEntries } from "../entries";
import { createTemplates } from "../templates";

const MAX_ROWS = 200;
const MAX_TREND_MONTHS = 36;

export class QueryError extends Error {}

const money = (cents: number) => ({
  cents,
  text: `R$ ${formatCents(cents)}`,
});

const requireMonth = (value: string): MonthKey => {
  if (!isMonthKey(value)) {
    throw new QueryError(`"${value}" is not a month, use the form 2026-10.`);
  }
  return value;
};

const requireDate = (value: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new QueryError(`"${value}" is not a date, use the form 2026-10-05.`);
  }
  return value;
};

export interface ExpenseFilter {
  from?: string;
  to?: string;
  category?: Category;
  text?: string;
}

export function createQueries(db: Db, now: () => Date = () => new Date()) {
  const templates = createTemplates(db);
  const entries = createEntries(db);

  const today = (): Today => todayOf(now());

  const billsOf = (month: MonthKey) =>
    buildBills(
      month,
      today(),
      templates.list(),
      resolveEntries(
        month,
        today().month,
        templates.list(),
        entries.listForMonth(month),
      ),
    );

  const expenseTotals = (
    rows: readonly { amountCents: number; category: string }[],
  ) => {
    const byCategory = new Map<string, number>();
    let total = 0;
    for (const row of rows) {
      total += row.amountCents;
      byCategory.set(
        row.category,
        (byCategory.get(row.category) ?? 0) + row.amountCents,
      );
    }
    return {
      total: money(total),
      byCategory: [...byCategory]
        .sort((a, b) => b[1] - a[1])
        .map(([category, cents]) => ({ category, total: money(cents) })),
    };
  };

  const selectExpenses = db.prepare(
    `SELECT id, description, amount_cents, category, spent_on FROM expenses
     WHERE spent_on >= @from AND spent_on <= @to
       AND (@category IS NULL OR category = @category)
     ORDER BY spent_on DESC, rowid DESC`,
  );
  const selectHistory = db.prepare(
    `SELECT month, amount_cents, paid_at FROM entries
     WHERE template_id = ? AND month >= ? AND month <= ?
     ORDER BY month`,
  );

  const expensesBetween = (filter: ExpenseFilter) => {
    const needle = filter.text ? normalizeText(filter.text) : null;
    return (
      selectExpenses.all({
        from: filter.from ? requireDate(filter.from) : "0000-01-01",
        to: filter.to ? requireDate(filter.to) : "9999-12-31",
        category: filter.category ?? null,
      }) as {
        id: string;
        description: string;
        amount_cents: number;
        category: Category;
        spent_on: string;
      }[]
    )
      .filter(
        (row) => !needle || normalizeText(row.description).includes(needle),
      )
      .map((row) => ({
        description: row.description,
        category: row.category,
        amountCents: row.amount_cents,
        spentOn: row.spent_on,
      }));
  };

  const groupSummary = (bills: ReturnType<typeof billsOf>) => {
    const totals = summarize(bills);
    return {
      pending: money(totals.pendingCents),
      paid: money(totals.paidCents),
      pendingCount: totals.pendingCount,
      paidCount: totals.paidCount,
      lateCount: totals.lateCount,
    };
  };

  return {
    today() {
      const { month, day } = today();
      return { date: isoDate(now()), month, day, timezone: process.env.TZ };
    },

    monthSummary(monthText: string) {
      const month = requireMonth(monthText);
      const bills = billsOf(month);
      const groups = {} as Record<Group, ReturnType<typeof groupSummary>>;
      for (const group of GROUPS) {
        groups[group] = groupSummary(bills.filter((b) => b.group === group));
      }
      const totals = summarize(bills);
      const oneOffs = expenseTotals(
        expensesBetween({ from: `${month}-01`, to: `${month}-31` }),
      );
      return {
        month,
        hasBills: bills.length > 0,
        pending: money(totals.pendingCents),
        paid: money(totals.paidCents),
        late: totals.lateCount,
        groups,
        oneOffExpenses: oneOffs,
      };
    },

    listBills(
      monthText: string,
      filter: { group?: Group; status?: EntryStatus } = {},
    ) {
      const month = requireMonth(monthText);
      return billsOf(month)
        .filter((b) => !filter.group || b.group === filter.group)
        .filter((b) => !filter.status || b.status === filter.status)
        .map((b) => ({
          name: b.name,
          group: b.group,
          dueDay: b.dueDay,
          amount: money(b.amountCents),
          defaultAmount: money(b.defaultCents),
          status: b.status,
          paidAt: b.paidAt,
          daysLate: b.daysLate,
        }));
    },

    billHistory(name: string, fromText?: string, toText?: string) {
      const from = fromText ? requireMonth(fromText) : "0000-01";
      const to = toText ? requireMonth(toText) : "9999-12";
      const needle = normalizeText(name);
      const matches = templates
        .list()
        .filter((t) => normalizeText(t.name).includes(needle));

      return matches.map((template) => {
        const stored = selectHistory.all(template.id, from, to) as {
          month: string;
          amount_cents: number;
          paid_at: string | null;
        }[];
        const current = today().month;
        const hasCurrent = stored.some((row) => row.month === current);
        const generated =
          !hasCurrent && current >= from && current <= to
            ? resolveEntries(current, current, [template], []).map((e) => ({
                month: current,
                amount_cents: e.amountCents,
                paid_at: e.paidAt,
              }))
            : [];
        return {
          name: template.name,
          group: template.group,
          active: template.active,
          defaultAmount: money(template.amountCents),
          months: [...stored, ...generated].map((row) => ({
            month: row.month,
            amount: money(row.amount_cents),
            paidAt: row.paid_at,
          })),
        };
      });
    },

    listExpenses(filter: ExpenseFilter = {}) {
      const rows = expensesBetween(filter);
      return {
        count: rows.length,
        ...expenseTotals(rows),
        rows: rows.slice(0, MAX_ROWS).map((r) => ({
          description: r.description,
          category: r.category,
          amount: money(r.amountCents),
          spentOn: r.spentOn,
        })),
        truncated: rows.length > MAX_ROWS,
      };
    },

    spendingTrend(count = 12) {
      const n = Math.min(Math.max(Math.trunc(count), 1), MAX_TREND_MONTHS);
      const current = today().month;
      return Array.from({ length: n }, (_, i) =>
        addMonths(current, i - n + 1),
      ).map((month) => {
        const bills = billsOf(month);
        const totals = summarize(bills);
        const cards = summarize(bills.filter((b) => b.group === "cards"));
        const oneOffs = expenseTotals(
          expensesBetween({ from: `${month}-01`, to: `${month}-31` }),
        );
        return {
          month,
          billsPending: money(totals.pendingCents),
          billsPaid: money(totals.paidCents),
          cards: money(cards.pendingCents + cards.paidCents),
          oneOffExpenses: oneOffs.total,
        };
      });
    },

    listRecurring(includeInactive = false) {
      return templates
        .list()
        .filter((t) => includeInactive || t.active)
        .map((t) => ({
          name: t.name,
          group: t.group,
          dueDay: t.dueDay,
          defaultAmount: t.amountCents > 0 ? money(t.amountCents) : null,
          variable: t.amountCents === 0,
          chargedAutomatically: t.autoPaid,
          active: t.active,
        }));
    },

    runSql(sql: string) {
      const text = sql.trim().replace(/;+\s*$/, "");
      if (!/^(select|with)\b/i.test(text)) {
        throw new QueryError("Only SELECT queries are allowed.");
      }
      let statement: Database.Statement;
      try {
        statement = db.prepare(`SELECT * FROM (${text}) LIMIT ${MAX_ROWS + 1}`);
      } catch (error) {
        throw new QueryError(
          error instanceof Error ? error.message : "Invalid query.",
        );
      }
      if (!statement.readonly)
        throw new QueryError("Only read-only queries are allowed.");

      db.pragma("query_only = ON");
      try {
        const rows = statement.all() as Record<string, unknown>[];
        return {
          rows: rows.slice(0, MAX_ROWS),
          truncated: rows.length > MAX_ROWS,
        };
      } catch (error) {
        throw new QueryError(
          error instanceof Error ? error.message : "Query failed.",
        );
      } finally {
        db.pragma("query_only = OFF");
      }
    },
  };
}

export type Queries = ReturnType<typeof createQueries>;
