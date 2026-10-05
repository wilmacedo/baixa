import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../shared/types";
import {
  CATEGORY_HOTKEYS,
  CATEGORY_LABELS,
  dateLabel,
  monthName,
  monthShort,
  paidOn,
  plural,
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
