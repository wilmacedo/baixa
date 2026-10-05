import { describe, expect, it } from "vitest";
import type { Bill } from "../shared/ledger";
import { isBillHidden } from "./bill-visibility";

const bill = (overrides: Partial<Bill> = {}): Bill => ({
  templateId: "rent",
  name: "Rent",
  group: "fixed",
  dueDay: 10,
  amountCents: 100000,
  defaultCents: 100000,
  paidAt: null,
  status: "pending",
  adjusted: false,
  daysLate: 0,
  ...overrides,
});

const rules = {
  showPaid: false,
  settling: new Set<string>(),
  editingId: null,
};

describe("isBillHidden", () => {
  it("never hides a bill that is not paid", () => {
    expect(isBillHidden(bill(), rules)).toBe(false);
    expect(isBillHidden(bill({ status: "late" }), rules)).toBe(false);
  });

  it("hides a paid bill by default", () => {
    expect(isBillHidden(bill({ status: "paid" }), rules)).toBe(true);
  });

  it("shows paid bills when asked to", () => {
    expect(
      isBillHidden(bill({ status: "paid" }), { ...rules, showPaid: true }),
    ).toBe(false);
  });

  it("keeps a paid bill visible while it is settling", () => {
    expect(
      isBillHidden(bill({ status: "paid" }), {
        ...rules,
        settling: new Set(["rent"]),
      }),
    ).toBe(false);
  });

  it("keeps a paid bill visible while it is being edited", () => {
    expect(
      isBillHidden(bill({ status: "paid" }), { ...rules, editingId: "rent" }),
    ).toBe(false);
  });
});
