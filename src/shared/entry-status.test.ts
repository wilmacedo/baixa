import { describe, expect, it } from "vitest";
import { entryStatus } from "./entry-status";

const today = { month: "2026-10", day: 5 };

describe("entryStatus", () => {
  it("is paid whenever the entry is paid", () => {
    expect(
      entryStatus({ month: "2026-09", dueDay: 3, paid: true }, today),
    ).toBe("paid");
    expect(
      entryStatus({ month: "2026-12", dueDay: 3, paid: true }, today),
    ).toBe("paid");
  });

  it("is late for any unpaid entry in a past month", () => {
    expect(
      entryStatus({ month: "2026-09", dueDay: 28, paid: false }, today),
    ).toBe("late");
  });

  it("is pending for any unpaid entry in a future month", () => {
    expect(
      entryStatus({ month: "2026-11", dueDay: 1, paid: false }, today),
    ).toBe("pending");
  });

  it("compares the due day with today inside the current month", () => {
    const status = (dueDay: number) =>
      entryStatus({ month: "2026-10", dueDay, paid: false }, today);
    expect(status(3)).toBe("late");
    expect(status(5)).toBe("today");
    expect(status(9)).toBe("pending");
  });
});
