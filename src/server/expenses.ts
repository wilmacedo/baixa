import { randomUUID } from "node:crypto";
import type { CategorizedExpense } from "../shared/category";
import type { MonthKey } from "../shared/months";
import type { Category, Expense, ExpenseInput } from "../shared/types";
import type { Db } from "./db";

interface ExpenseRow {
  id: string;
  description: string;
  amount_cents: number;
  category: Category;
  spent_on: string;
}

const toExpense = (row: ExpenseRow): Expense => ({
  id: row.id,
  description: row.description,
  amountCents: row.amount_cents,
  category: row.category,
  spentOn: row.spent_on,
});

export function createExpenses(db: Db) {
  const columns = "id, description, amount_cents, category, spent_on";
  const selectMonth = db.prepare(
    `SELECT ${columns} FROM expenses
     WHERE substr(spent_on, 1, 7) = ?
     ORDER BY spent_on DESC, rowid DESC`,
  );
  const selectOne = db.prepare(`SELECT ${columns} FROM expenses WHERE id = ?`);
  const insert = db.prepare(
    `INSERT INTO expenses (${columns})
     VALUES (@id, @description, @amount_cents, @category, @spent_on)`,
  );
  const update = db.prepare(
    `UPDATE expenses
     SET description = @description, amount_cents = @amount_cents,
         category = @category, spent_on = @spent_on
     WHERE id = @id`,
  );
  const remove = db.prepare("DELETE FROM expenses WHERE id = ?");
  const selectHistory = db.prepare(
    `SELECT description, category FROM (
       SELECT description, category, spent_on, rowid AS position FROM expenses
       ORDER BY spent_on DESC, rowid DESC LIMIT ?
     ) ORDER BY spent_on, position`,
  );

  const get = (id: string): Expense | undefined => {
    const row = selectOne.get(id) as ExpenseRow | undefined;
    return row && toExpense(row);
  };

  const toParams = (id: string, input: ExpenseInput) => ({
    id,
    description: input.description,
    amount_cents: input.amountCents,
    category: input.category,
    spent_on: input.spentOn,
  });

  return {
    listForMonth: (month: MonthKey): Expense[] =>
      (selectMonth.all(month) as ExpenseRow[]).map(toExpense),

    get,

    history: (limit: number): CategorizedExpense[] =>
      selectHistory.all(limit) as CategorizedExpense[],

    create(input: ExpenseInput): Expense {
      const id = randomUUID();
      insert.run(toParams(id, input));
      return get(id) as Expense;
    },

    replace(id: string, input: ExpenseInput): Expense | undefined {
      if (update.run(toParams(id, input)).changes === 0) return undefined;
      return get(id);
    },

    delete: (id: string): boolean => remove.run(id).changes > 0,
  };
}

export type Expenses = ReturnType<typeof createExpenses>;
