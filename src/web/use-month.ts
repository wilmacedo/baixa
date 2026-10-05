import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { resolveEntries } from "../shared/generate-month";
import type { MonthKey } from "../shared/months";
import type {
  Entry,
  Expense,
  ExpenseInput,
  TemplatePatch,
} from "../shared/types";
import { api } from "./api";
import { initialMonthState, monthReducer } from "./month-state";
import { newId } from "./new-id";

export function useMonth(month: MonthKey, currentMonth: MonthKey) {
  const [state, dispatch] = useReducer(monthReducer, month, initialMonthState);
  const latest = useRef(state);
  latest.current = state;

  const isShowing = state.month === month;
  const belongsHere = (spentOn: string) => spentOn.startsWith(month);
  const stillShowing = () => latest.current.month === month;

  const load = useCallback(() => {
    dispatch({ type: "load", month });
    api.getMonth(month).then(
      (data) => dispatch({ type: "loaded", data }),
      () => dispatch({ type: "loadFailed", month }),
    );
  }, [month]);

  useEffect(load, [load]);

  const saveEntry = async (entry: Entry): Promise<boolean> => {
    const previous = latest.current.entries.find(
      (e) => e.templateId === entry.templateId,
    );
    if (stillShowing()) dispatch({ type: "entrySet", entry });
    try {
      await api.saveEntry(month, entry);
      return true;
    } catch {
      if (stillShowing()) {
        dispatch({
          type: "entryReverted",
          templateId: entry.templateId,
          previous,
        });
      }
      return false;
    }
  };

  const updateTemplate = async (
    id: string,
    patch: TemplatePatch,
  ): Promise<boolean> => {
    const previous = latest.current.templates.find((t) => t.id === id);
    if (!previous) return false;

    if (stillShowing()) {
      dispatch({ type: "templateSet", template: { ...previous, ...patch } });
    }
    try {
      await api.updateTemplate(id, patch);
      return true;
    } catch {
      if (stillShowing()) dispatch({ type: "templateSet", template: previous });
      return false;
    }
  };

  const addExpense = async (
    input: ExpenseInput,
    id: string = newId(),
  ): Promise<Expense | undefined> => {
    const expense: Expense = { id, ...input };
    if (stillShowing() && belongsHere(input.spentOn)) {
      dispatch({ type: "expenseAdded", expense });
    }
    try {
      return await api.createExpense(expense);
    } catch {
      if (stillShowing()) dispatch({ type: "expenseRemoved", id: expense.id });
      return undefined;
    }
  };

  const replaceExpense = async (
    id: string,
    input: ExpenseInput,
  ): Promise<boolean> => {
    const previous = latest.current.expenses.find((e) => e.id === id);
    if (stillShowing()) {
      dispatch(
        belongsHere(input.spentOn)
          ? { type: "expenseSwapped", id, expense: { id, ...input } }
          : { type: "expenseRemoved", id },
      );
    }
    try {
      await api.replaceExpense(id, input);
      return true;
    } catch {
      if (stillShowing() && previous) {
        dispatch(
          belongsHere(input.spentOn)
            ? { type: "expenseSwapped", id, expense: previous }
            : { type: "expenseAdded", expense: previous },
        );
      }
      return false;
    }
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    const previous = latest.current.expenses.find((e) => e.id === id);
    if (stillShowing()) dispatch({ type: "expenseRemoved", id });
    try {
      await api.deleteExpense(id);
      return true;
    } catch {
      if (stillShowing() && previous) {
        dispatch({ type: "expenseAdded", expense: previous });
      }
      return false;
    }
  };

  const entries = useMemo(
    () =>
      isShowing
        ? resolveEntries(month, currentMonth, state.templates, state.entries)
        : [],
    [isShowing, month, currentMonth, state.templates, state.entries],
  );

  return {
    status: isShowing ? state.status : ("loading" as const),
    templates: isShowing ? state.templates : [],
    entries,
    expenses: isShowing ? state.expenses : [],
    failedEntries: isShowing ? state.failedEntries : [],
    reload: load,
    saveEntry,
    updateTemplate,
    addExpense,
    replaceExpense,
    deleteExpense,
  };
}
