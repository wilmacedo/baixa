import { describe, expect, it } from "vitest";
import type { Entry, Expense, MonthData, Template } from "../shared/types";
import {
  initialMonthState,
  type MonthAction,
  type MonthState,
  monthReducer,
} from "./month-state";

const rentEntry: Entry = {
  templateId: "rent",
  amountCents: 100000,
  paidAt: null,
};
const lunch: Expense = {
  id: "e1",
  description: "Lunch",
  amountCents: 4590,
  category: "leisure",
  spentOn: "2026-10-03",
};

const data = (overrides: Partial<MonthData> = {}): MonthData => ({
  month: "2026-10",
  templates: [],
  entries: [],
  expenses: [],
  ...overrides,
});

const run = (state: MonthState, ...actions: MonthAction[]) =>
  actions.reduce(monthReducer, state);

const ready = (overrides: Partial<MonthData> = {}) =>
  run(initialMonthState("2026-10"), { type: "loaded", data: data(overrides) });

describe("loading", () => {
  it("starts loading", () => {
    expect(initialMonthState("2026-10").status).toBe("loading");
  });

  it("becomes ready with the loaded data", () => {
    const state = ready({ entries: [rentEntry], expenses: [lunch] });

    expect(state).toMatchObject({
      status: "ready",
      entries: [rentEntry],
      expenses: [lunch],
    });
  });

  it("ignores a response for a month that is no longer shown", () => {
    const state = run(initialMonthState("2026-11"), {
      type: "loaded",
      data: data({ entries: [rentEntry] }),
    });

    expect(state.status).toBe("loading");
    expect(state.entries).toEqual([]);
  });

  it("ignores a failure for a month that is no longer shown", () => {
    const state = run(initialMonthState("2026-11"), {
      type: "loadFailed",
      month: "2026-10",
    });

    expect(state.status).toBe("loading");
  });

  it("flags a failure for the current month", () => {
    const state = run(initialMonthState("2026-10"), {
      type: "loadFailed",
      month: "2026-10",
    });

    expect(state.status).toBe("error");
  });

  it("resets everything when another month starts loading", () => {
    const state = run(ready({ entries: [rentEntry] }), {
      type: "load",
      month: "2026-11",
    });

    expect(state).toEqual(initialMonthState("2026-11"));
  });
});

describe("templates", () => {
  const rent: Template = {
    id: "rent",
    name: "Rent",
    amountCents: 100000,
    dueDay: 10,
    group: "fixed",
    active: true,
    position: 1,
  };

  it("replaces a template by id", () => {
    const other = { ...rent, id: "gym", name: "Gym" };
    const state = run(ready({ templates: [rent, other] }), {
      type: "templateSet",
      template: { ...rent, amountCents: 105000 },
    });

    expect(state.templates).toEqual([{ ...rent, amountCents: 105000 }, other]);
  });
});

describe("entries", () => {
  it("adds a new entry", () => {
    const state = run(ready(), { type: "entrySet", entry: rentEntry });

    expect(state.entries).toEqual([rentEntry]);
  });

  it("replaces an existing entry of the same template", () => {
    const paid = { ...rentEntry, paidAt: "2026-10-05" };
    const state = run(ready({ entries: [rentEntry] }), {
      type: "entrySet",
      entry: paid,
    });

    expect(state.entries).toEqual([paid]);
  });

  it("restores the previous entry and flags the failure", () => {
    const paid = { ...rentEntry, paidAt: "2026-10-05" };
    const state = run(
      ready({ entries: [rentEntry] }),
      { type: "entrySet", entry: paid },
      { type: "entryReverted", templateId: "rent", previous: rentEntry },
    );

    expect(state.entries).toEqual([rentEntry]);
    expect(state.failedEntries).toEqual(["rent"]);
  });

  it("removes the entry when there was no previous one", () => {
    const state = run(
      ready(),
      { type: "entrySet", entry: rentEntry },
      { type: "entryReverted", templateId: "rent", previous: undefined },
    );

    expect(state.entries).toEqual([]);
    expect(state.failedEntries).toEqual(["rent"]);
  });

  it("clears every failure flag on request", () => {
    const state = run(
      ready(),
      { type: "entryReverted", templateId: "rent", previous: undefined },
      { type: "entryReverted", templateId: "gym", previous: undefined },
      { type: "failuresCleared" },
    );

    expect(state.failedEntries).toEqual([]);
  });

  it("clears the failure flag on the next attempt", () => {
    const state = run(
      ready(),
      { type: "entryReverted", templateId: "rent", previous: undefined },
      { type: "entrySet", entry: rentEntry },
    );

    expect(state.failedEntries).toEqual([]);
  });
});

describe("expenses", () => {
  it("keeps the newest date first, and the latest addition first on a tie", () => {
    const early = { ...lunch, id: "e0", spentOn: "2026-10-01" };
    const sameDay = { ...lunch, id: "e2" };
    const state = run(ready({ expenses: [lunch, early] }), {
      type: "expenseAdded",
      expense: sameDay,
    });

    expect(state.expenses.map((e) => e.id)).toEqual(["e2", "e1", "e0"]);
  });

  it("swaps a temporary expense for the saved one", () => {
    const temporary = { ...lunch, id: "temp" };
    const saved = { ...lunch, id: "e9" };
    const state = run(
      ready(),
      { type: "expenseAdded", expense: temporary },
      { type: "expenseSwapped", id: "temp", expense: saved },
    );

    expect(state.expenses).toEqual([saved]);
  });

  it("re-sorts when an edit changes the date", () => {
    const later = { ...lunch, id: "e2", spentOn: "2026-10-20" };
    const state = run(ready({ expenses: [later, lunch] }), {
      type: "expenseSwapped",
      id: "e1",
      expense: { ...lunch, spentOn: "2026-10-25" },
    });

    expect(state.expenses.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("removes an expense", () => {
    const state = run(ready({ expenses: [lunch] }), {
      type: "expenseRemoved",
      id: "e1",
    });

    expect(state.expenses).toEqual([]);
  });
});
