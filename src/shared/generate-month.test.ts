import { describe, expect, it } from "vitest";
import { resolveEntries } from "./generate-month";
import type { Entry, Template } from "./types";

const template = (overrides: Partial<Template> & { id: string }): Template => ({
  name: overrides.id,
  amountCents: 10000,
  dueDay: 10,
  group: "fixed",
  active: true,
  position: 0,
  ...overrides,
});

const templates = [
  template({ id: "internet", amountCents: 12000, position: 2 }),
  template({ id: "rent", amountCents: 100000, position: 1 }),
  template({ id: "gym", amountCents: 9000, position: 3, active: false }),
];

const current = "2026-10";

describe("resolveEntries", () => {
  it("generates pending entries for active templates, ordered by position", () => {
    expect(resolveEntries("2026-10", current, templates, [])).toEqual([
      { templateId: "rent", amountCents: 100000, paidAt: null },
      { templateId: "internet", amountCents: 12000, paidAt: null },
    ]);
  });

  it("generates an empty entry for a template without a default amount", () => {
    const variable = [template({ id: "card", amountCents: 0 })];
    expect(resolveEntries("2026-10", current, variable, [])).toEqual([
      { templateId: "card", amountCents: 0, paidAt: null },
    ]);
  });

  it("generates entries for future months too", () => {
    const ids = resolveEntries("2027-02", current, templates, []).map(
      (e) => e.templateId,
    );
    expect(ids).toEqual(["rent", "internet"]);
  });

  it("returns nothing for a past month without stored entries", () => {
    expect(resolveEntries("2026-09", current, templates, [])).toEqual([]);
  });

  it("returns only the stored entries for a past month", () => {
    const stored: Entry[] = [
      { templateId: "internet", amountCents: 11500, paidAt: "2026-09-10" },
    ];
    expect(resolveEntries("2026-09", current, templates, stored)).toEqual(
      stored,
    );
  });

  it("prefers a stored entry over the template values", () => {
    const stored: Entry[] = [
      { templateId: "rent", amountCents: 105000, paidAt: "2026-10-05" },
    ];
    expect(resolveEntries("2026-10", current, templates, stored)).toEqual([
      { templateId: "rent", amountCents: 105000, paidAt: "2026-10-05" },
      { templateId: "internet", amountCents: 12000, paidAt: null },
    ]);
  });

  it("keeps a stored entry of a template that was deactivated", () => {
    const stored: Entry[] = [
      { templateId: "gym", amountCents: 9000, paidAt: null },
    ];
    const ids = resolveEntries("2026-10", current, templates, stored).map(
      (e) => e.templateId,
    );
    expect(ids).toEqual(["rent", "internet", "gym"]);
  });

  it("does not follow later template changes once a month is stored", () => {
    const stored: Entry[] = [
      { templateId: "rent", amountCents: 100000, paidAt: null },
    ];
    const changed = templates.map((t) =>
      t.id === "rent" ? { ...t, amountCents: 150000 } : t,
    );
    const [rent] = resolveEntries("2026-11", current, changed, stored);
    expect(rent?.amountCents).toBe(100000);
  });

  it("ignores stored entries whose template no longer exists", () => {
    const stored: Entry[] = [
      { templateId: "gone", amountCents: 5000, paidAt: null },
    ];
    const ids = resolveEntries("2026-10", current, templates, stored).map(
      (e) => e.templateId,
    );
    expect(ids).not.toContain("gone");
  });
});
