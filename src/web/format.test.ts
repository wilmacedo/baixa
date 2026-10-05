import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../shared/types";
import {
  billTag,
  CATEGORY_HOTKEYS,
  CATEGORY_LABELS,
  dateLabel,
  monthName,
  monthShort,
  paidOn,
  plural,
  todayMarker,
} from "./format";

describe("month names", () => {
  it("spells the month in Portuguese", () => {
    expect(monthName("2026-03")).toBe("março");
    expect(monthName("2026-10")).toBe("outubro");
  });

  it("abbreviates the month with the year", () => {
    expect(monthShort("2026-10")).toBe("out 2026");
  });
});

describe("plural", () => {
  it("uses the singular only for one", () => {
    expect(plural(1, "conta", "contas")).toBe("1 conta");
    expect(plural(0, "conta", "contas")).toBe("0 contas");
    expect(plural(3, "conta", "contas")).toBe("3 contas");
  });
});

describe("paidOn", () => {
  it("shows day and month", () => {
    expect(paidOn("2026-10-05")).toBe("05/10");
    expect(paidOn("2026-12-25")).toBe("25/12");
  });
});

describe("dateLabel", () => {
  const today = "2026-10-05";

  it("says today and yesterday", () => {
    expect(dateLabel("2026-10-05", today)).toBe("hoje, 5 out");
    expect(dateLabel("2026-10-04", today)).toBe("ontem, 4 out");
  });

  it("uses the weekday for other days", () => {
    expect(dateLabel("2026-10-02", today)).toBe("sex, 2 out");
    expect(dateLabel("2026-09-28", today)).toBe("seg, 28 set");
  });
});

describe("categories", () => {
  it("labels every category with a unique hotkey that starts its label", () => {
    const hotkeys = CATEGORIES.map((c) => CATEGORY_HOTKEYS[c]);

    expect(new Set(hotkeys).size).toBe(CATEGORIES.length);
    for (const category of CATEGORIES) {
      expect(CATEGORY_LABELS[category].toLowerCase()).toMatch(
        new RegExp(`^${CATEGORY_HOTKEYS[category]}`),
      );
    }
  });
});

describe("billTag", () => {
  const base = {
    status: "pending",
    daysLate: 0,
    paidAt: null,
    adjusted: false,
  } as const;

  it("is empty for a plain pending bill", () => {
    expect(billTag(base)).toBeNull();
  });

  it("flags an adjusted amount", () => {
    expect(billTag({ ...base, adjusted: true })).toBe("ajustado");
  });

  it("says when a bill is due today", () => {
    expect(billTag({ ...base, status: "today" })).toBe("vence hoje");
  });

  it("counts the days late, or just says late", () => {
    expect(billTag({ ...base, status: "late", daysLate: 1 })).toBe("há 1 dia");
    expect(billTag({ ...base, status: "late", daysLate: 2 })).toBe("há 2 dias");
    expect(billTag({ ...base, status: "late" })).toBe("atrasada");
  });

  it("shows when a bill was paid", () => {
    expect(billTag({ ...base, status: "paid", paidAt: "2026-10-05" })).toBe(
      "pago 05/10",
    );
    expect(billTag({ ...base, status: "paid" })).toBe("pago");
  });

  it("gives editing and failure priority", () => {
    const late = { ...base, status: "late", daysLate: 2 } as const;

    expect(billTag(late, { editing: true })).toBe("editando");
    expect(billTag(late, { editing: true, failed: true })).toBe("não salvou");
  });
});

describe("todayMarker", () => {
  it("labels the marker with the day and month", () => {
    expect(todayMarker({ month: "2026-10", day: 5 })).toBe("hoje · 5 out");
  });
});
