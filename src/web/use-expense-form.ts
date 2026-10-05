import { useState } from "react";
import { type CategorizedExpense, detectCategory } from "../shared/category";
import { addDays, daysBetween } from "../shared/dates";
import { parseRaw, toRaw } from "../shared/money";
import type { Today } from "../shared/months";
import {
  CATEGORIES,
  type Category,
  type Expense,
  type ExpenseInput,
} from "../shared/types";
import { CATEGORY_LABELS } from "./format";

const MAX_DAYS_BACK = 60;

export type ExpenseProblem = "amount" | "category";

interface ExpenseFormOptions {
  today: Today;
  history: readonly CategorizedExpense[];
  initialRaw?: string;
  editing?: Expense;
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export function useExpenseForm({
  today,
  history,
  initialRaw = "",
  editing,
}: ExpenseFormOptions) {
  const todayIso = `${today.month}-${String(today.day).padStart(2, "0")}`;
  const earliest = addDays(todayIso, -MAX_DAYS_BACK);

  const [raw, setRaw] = useState(
    editing ? toRaw(editing.amountCents) : initialRaw,
  );
  const [description, setDescription] = useState(editing?.description ?? "");
  const [category, setCategory] = useState<Category | null>(
    editing?.category ?? null,
  );
  const [date, setDate] = useState(editing?.spentOn ?? todayIso);
  const [problem, setProblem] = useState<ExpenseProblem | null>(null);

  const amountCents = parseRaw(raw);
  const detected = category ? null : detectCategory(description, history);
  const shown = category ?? detected;

  const validate = (
    typed: string = description,
  ): { input: ExpenseInput } | { problem: ExpenseProblem } => {
    if (amountCents <= 0) return { problem: "amount" };

    const resolved = category ?? detectCategory(typed, history);
    if (!resolved) return { problem: "category" };

    return {
      input: {
        description: capitalize(typed.trim() || CATEGORY_LABELS[resolved]),
        amountCents,
        category: resolved,
        spentOn: date,
      },
    };
  };

  const moveDate = (days: number) => {
    const next = addDays(date, days);
    if (next >= earliest && next <= todayIso) setDate(next);
  };

  const cycleCategory = (step: number) => {
    const current = shown ? CATEGORIES.indexOf(shown) : -1;
    const next =
      current < 0
        ? 0
        : (current + step + CATEGORIES.length) % CATEGORIES.length;
    setCategory(CATEGORIES[next] ?? null);
    setProblem(null);
  };

  return {
    todayIso,
    raw,
    amountCents,
    description,
    category,
    date,
    problem,
    detected,
    shown,
    canGoForward: daysBetween(date, todayIso) > 0,
    changeRaw: (next: string) => {
      setRaw(next);
      setProblem(null);
    },
    changeDescription: (next: string) => {
      setDescription(next);
      setProblem(null);
    },
    pickCategory: (next: Category) => {
      setCategory(next);
      setProblem(null);
    },
    setDate,
    setProblem,
    moveDate,
    cycleCategory,
    validate,
  };
}
