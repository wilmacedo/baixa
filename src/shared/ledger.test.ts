import { describe, expect, it } from "vitest";
import {
  type Bill,
  billsByGroup,
  buildBills,
  nextDue,
  paymentDate,
  summarize,
} from "./ledger";
import type { Entry, Template } from "./types";

const template = (id: string, overrides: Partial<Template> = {}): Template => ({
  id,
  name: id,
  amountCents: 10000,
  dueDay: 10,
  group: "fixed",
  active: true,
  autoPaid: false,
  position: 0,
  ...overrides,
});

const entry = (templateId: string, overrides: Partial<Entry> = {}): Entry => ({
  templateId,
  amountCents: 10000,
  paidAt: null,
  ...overrides,
});

const today = { month: "2026-10", day: 5 };

const bill = (overrides: Partial<Bill> = {}): Bill => ({
  templateId: "t",
  name: "t",
  group: "fixed",
  dueDay: 10,
  amountCents: 10000,
  defaultCents: 10000,
  paidAt: null,
  status: "pending",
  adjusted: false,
  daysLate: 0,
  ...overrides,
});

describe("buildBills", () => {
  it("joins entries with their templates", () => {
    const [rent] = buildBills(
      "2026-10",
      today,
      [template("rent", { name: "Rent", dueDay: 3, group: "cards" })],
      [entry("rent", { amountCents: 12000, paidAt: "2026-10-04" })],
    );

    expect(rent).toMatchObject({
      templateId: "rent",
      name: "Rent",
      group: "cards",
      dueDay: 3,
      amountCents: 12000,
      defaultCents: 10000,
      paidAt: "2026-10-04",
      status: "paid",
      adjusted: true,
    });
  });

  it("counts the days late only in the current month", () => {
    const templates = [template("rent", { dueDay: 3 })];

    const [current] = buildBills("2026-10", today, templates, [entry("rent")]);
    const [past] = buildBills("2026-09", today, templates, [entry("rent")]);

    expect(current).toMatchObject({ status: "late", daysLate: 2 });
    expect(past).toMatchObject({ status: "late", daysLate: 0 });
  });

  it("is not adjusted when the amount matches the template", () => {
    const [rent] = buildBills(
      "2026-10",
      today,
      [template("rent")],
      [entry("rent")],
    );

    expect(rent?.adjusted).toBe(false);
  });

  it("skips entries without a template", () => {
    expect(buildBills("2026-10", today, [], [entry("gone")])).toEqual([]);
  });
});

describe("billsByGroup", () => {
  it("splits by group and sorts by due day, then name", () => {
    const groups = billsByGroup([
      bill({ name: "Zeta", dueDay: 5 }),
      bill({ name: "Alpha", dueDay: 9 }),
      bill({ name: "Beta", dueDay: 5 }),
      bill({ name: "Card", group: "cards" }),
    ]);

    expect(groups.fixed.map((b) => b.name)).toEqual(["Beta", "Zeta", "Alpha"]);
    expect(groups.cards.map((b) => b.name)).toEqual(["Card"]);
    expect(groups.charges).toEqual([]);
  });
});

describe("summarize", () => {
  it("totals pending and paid amounts and counts", () => {
    const totals = summarize([
      bill({ amountCents: 30000, status: "paid" }),
      bill({ amountCents: 10000, status: "pending" }),
      bill({ amountCents: 20000, status: "late" }),
      bill({ amountCents: 5000, status: "today" }),
    ]);

    expect(totals).toEqual({
      pendingCents: 35000,
      paidCents: 30000,
      pendingCount: 3,
      paidCount: 1,
      lateCount: 1,
      progress: 30000 / 65000,
    });
  });

  it("treats a month with nothing to pay as fully done", () => {
    expect(summarize([]).progress).toBe(1);
  });
});

describe("nextDue", () => {
  it("returns the earliest upcoming day with all of its bills", () => {
    const next = nextDue([
      bill({ name: "A", dueDay: 12 }),
      bill({ name: "B", dueDay: 9 }),
      bill({ name: "C", dueDay: 9, status: "today" }),
      bill({ name: "D", dueDay: 2, status: "late" }),
      bill({ name: "E", dueDay: 1, status: "paid" }),
    ]);

    expect(next?.day).toBe(9);
    expect(next?.bills.map((b) => b.name)).toEqual(["B", "C"]);
  });

  it("returns nothing when there is nothing upcoming", () => {
    expect(
      nextDue([bill({ status: "late" }), bill({ status: "paid" })]),
    ).toBeUndefined();
  });
});

describe("paymentDate", () => {
  it("is today for the current and future months", () => {
    expect(paymentDate("2026-10", 3, today)).toBe("2026-10-05");
    expect(paymentDate("2026-12", 20, today)).toBe("2026-10-05");
  });

  it("is the due day for past months", () => {
    expect(paymentDate("2026-09", 7, today)).toBe("2026-09-07");
  });
});
