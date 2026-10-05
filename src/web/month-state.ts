import type { MonthKey } from "../shared/months";
import type { Entry, Expense, MonthData, Template } from "../shared/types";

export interface MonthState {
  status: "loading" | "ready" | "error";
  month: MonthKey;
  templates: Template[];
  entries: Entry[];
  expenses: Expense[];
  failedEntries: string[];
}

export type MonthAction =
  | { type: "load"; month: MonthKey }
  | { type: "loaded"; data: MonthData }
  | { type: "loadFailed"; month: MonthKey }
  | { type: "entrySet"; entry: Entry }
  | { type: "entryReverted"; templateId: string; previous: Entry | undefined }
  | { type: "expenseAdded"; expense: Expense }
  | { type: "expenseSwapped"; id: string; expense: Expense }
  | { type: "expenseRemoved"; id: string };

export const initialMonthState = (month: MonthKey): MonthState => ({
  status: "loading",
  month,
  templates: [],
  entries: [],
  expenses: [],
  failedEntries: [],
});

const newestFirst = (expenses: Expense[]) =>
  [...expenses].sort((a, b) => b.spentOn.localeCompare(a.spentOn));

const withoutEntry = (entries: Entry[], templateId: string) =>
  entries.filter((e) => e.templateId !== templateId);

export function monthReducer(
  state: MonthState,
  action: MonthAction,
): MonthState {
  switch (action.type) {
    case "load":
      return initialMonthState(action.month);

    case "loaded":
      if (action.data.month !== state.month) return state;
      return {
        ...state,
        status: "ready",
        templates: action.data.templates,
        entries: action.data.entries,
        expenses: newestFirst(action.data.expenses),
      };

    case "loadFailed":
      return action.month === state.month
        ? { ...state, status: "error" }
        : state;

    case "entrySet":
      return {
        ...state,
        entries: [
          ...withoutEntry(state.entries, action.entry.templateId),
          action.entry,
        ],
        failedEntries: state.failedEntries.filter(
          (id) => id !== action.entry.templateId,
        ),
      };

    case "entryReverted": {
      const rest = withoutEntry(state.entries, action.templateId);
      return {
        ...state,
        entries: action.previous ? [...rest, action.previous] : rest,
        failedEntries: [
          ...state.failedEntries.filter((id) => id !== action.templateId),
          action.templateId,
        ],
      };
    }

    case "expenseAdded":
      return {
        ...state,
        expenses: newestFirst([action.expense, ...state.expenses]),
      };

    case "expenseSwapped":
      return {
        ...state,
        expenses: newestFirst(
          state.expenses.map((e) => (e.id === action.id ? action.expense : e)),
        ),
      };

    case "expenseRemoved":
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.id),
      };
  }
}
