import { describe, expect, it } from "vitest";
import { buildPlan, mapCategory, type TabInput } from "./plan";
import type { SheetBill } from "./tab";

const bill = (name: string, overrides: Partial<SheetBill> = {}): SheetBill => ({
  name,
  group: "fixed",
  amountCents: 100000,
  paid: false,
  paidOn: null,
  ...overrides,
});

const tabs: TabInput[] = [
  {
    month: "2026-08",
    tab: {
      bills: [
        bill("Rent", { paid: true, paidOn: "2026-08-10" }),
        bill("Gym", {
          group: "charges",
          amountCents: 25000,
          paid: true,
          paidOn: "2026-08-05",
        }),
      ],
      expenses: [
        {
          description: "Padaria",
          categoryText: "Mercado",
          amountCents: 1850,
          spentOn: "2026-08-05",
        },
      ],
    },
  },
  {
    month: "2026-09",
    tab: {
      bills: [
        bill("Rent", { amountCents: 110000, paid: true, paidOn: "2026-09-09" }),
        bill("Power", { amountCents: null }),
      ],
      expenses: [],
    },
  },
];

describe("buildPlan templates", () => {
  const plan = buildPlan(tabs);
  const template = (name: string) =>
    plan.templates.find((t) => t.name === name);

  it("uses the latest amount and the latest payment day", () => {
    expect(template("Rent")).toMatchObject({ amountCents: 110000, dueDay: 9 });
  });

  it("keeps only bills of the latest month active", () => {
    expect(template("Rent")?.active).toBe(true);
    expect(template("Gym")?.active).toBe(false);
  });

  it("skips a bill that never had an amount, with a warning", () => {
    expect(template("Power")).toBeUndefined();
    expect(plan.warnings.join("\n")).toContain('Skipped "Power"');
  });

  it("matches bills across months ignoring case and accents", () => {
    const result = buildPlan([
      { month: "2026-08", tab: { bills: [bill("Energia")], expenses: [] } },
      { month: "2026-09", tab: { bills: [bill("ENERGIA")], expenses: [] } },
    ]);

    expect(result.templates).toHaveLength(1);
    expect(result.entries).toHaveLength(2);
  });
});

describe("buildPlan entries", () => {
  const plan = buildPlan(tabs);

  it("stores one entry per bill and month with its paid date", () => {
    expect(plan.entries).toContainEqual({
      templateKey: "fixed:rent",
      month: "2026-09",
      amountCents: 110000,
      paidAt: "2026-09-09",
    });
  });

  it("falls back to the due day when a paid bill has no date", () => {
    const result = buildPlan([
      {
        month: "2026-08",
        tab: {
          bills: [bill("Rent", { paid: true, paidOn: null })],
          expenses: [],
        },
      },
      {
        month: "2026-09",
        tab: {
          bills: [bill("Rent", { paid: true, paidOn: "2026-09-07" })],
          expenses: [],
        },
      },
    ]);

    expect(result.entries[0]?.paidAt).toBe("2026-08-07");
  });

  it("keeps the first of two bills with the same name in a month", () => {
    const result = buildPlan([
      {
        month: "2026-08",
        tab: {
          bills: [bill("Rent"), bill("Rent", { amountCents: 5 })],
          expenses: [],
        },
      },
    ]);

    expect(result.entries).toHaveLength(1);
    expect(result.warnings.join("\n")).toContain("appears twice");
  });
});

describe("buildPlan expenses and totals", () => {
  const plan = buildPlan(tabs);

  it("maps the expense category", () => {
    expect(plan.expenses).toEqual([
      {
        description: "Padaria",
        amountCents: 1850,
        category: "groceries",
        spentOn: "2026-08-05",
      },
    ]);
  });

  it("totals each month for conferring with the spreadsheet", () => {
    expect(plan.months).toEqual([
      {
        month: "2026-08",
        pendingCents: 0,
        paidCents: 125000,
        cardsCents: 0,
        expensesCents: 1850,
      },
      {
        month: "2026-09",
        pendingCents: 0,
        paidCents: 110000,
        cardsCents: 0,
        expensesCents: 0,
      },
    ]);
  });
});

describe("mapCategory", () => {
  it("uses the spreadsheet category when it is a known one", () => {
    expect(mapCategory("Saúde", "Qualquer coisa")).toBe("health");
  });

  it("falls back to the description, then to other", () => {
    expect(mapCategory("", "Uber")).toBe("transport");
    expect(mapCategory("???", "Presente")).toBe("other");
  });
});
