import { describe, expect, it } from "vitest";
import type { Bill } from "../shared/ledger";
import { bucketBills } from "./date-buckets";

const today = { month: "2026-10", day: 5 };

const bill = (
  name: string,
  dueDay: number,
  overrides: Partial<Bill> = {},
): Bill => ({
  templateId: name,
  name,
  group: "fixed",
  dueDay,
  amountCents: 10000,
  defaultCents: 10000,
  paidAt: null,
  status: dueDay < 5 ? "late" : dueDay === 5 ? "today" : "pending",
  adjusted: false,
  daysLate: 0,
  ...overrides,
});

const summary = (buckets: ReturnType<typeof bucketBills>) =>
  buckets.map((b) => [b.label, b.bills.map((x) => x.name)]);

describe("bucketBills in the current month", () => {
  it("splits bills by how soon they are due", () => {
    const buckets = bucketBills(
      [
        bill("Late", 3),
        bill("Today", 5),
        bill("Soon", 9),
        bill("Soonest", 12),
        bill("Far", 20),
      ],
      "2026-10",
      today,
    );

    expect(summary(buckets)).toEqual([
      ["atrasadas", ["Late"]],
      ["até hoje", ["Today"]],
      ["próximos 7 dias", ["Soon", "Soonest"]],
      ["mais adiante", ["Far"]],
    ]);
  });

  it("keeps paid bills of earlier days under 'até hoje'", () => {
    const buckets = bucketBills(
      [bill("Done", 2, { status: "paid" }), bill("Late", 3)],
      "2026-10",
      today,
    );

    expect(summary(buckets)).toEqual([
      ["atrasadas", ["Late"]],
      ["até hoje", ["Done"]],
    ]);
  });

  it("sums only what is still unpaid", () => {
    const [bucket] = bucketBills(
      [
        bill("A", 9, { amountCents: 30000 }),
        bill("B", 10, { status: "paid", amountCents: 50000 }),
      ],
      "2026-10",
      today,
    );

    expect(bucket?.sumCents).toBe(30000);
  });

  it("sorts by due day and drops empty buckets", () => {
    const buckets = bucketBills(
      [bill("Z", 20), bill("A", 20), bill("M", 18)],
      "2026-10",
      today,
    );

    expect(summary(buckets)).toEqual([["mais adiante", ["M", "A", "Z"]]]);
  });
});

describe("bucketBills in other months", () => {
  it("separates late and paid bills in a past month", () => {
    const buckets = bucketBills(
      [
        bill("Paid", 5, { status: "paid" }),
        bill("Open", 7, { status: "late" }),
      ],
      "2026-09",
      today,
    );

    expect(summary(buckets)).toEqual([
      ["atrasadas", ["Open"]],
      ["pagas", ["Paid"]],
    ]);
  });

  it("splits a future month in two halves", () => {
    const buckets = bucketBills(
      [bill("Early", 15), bill("Late", 16)],
      "2026-11",
      today,
    );

    expect(summary(buckets)).toEqual([
      ["1ª quinzena", ["Early"]],
      ["2ª quinzena", ["Late"]],
    ]);
  });
});
