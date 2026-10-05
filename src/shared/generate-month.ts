import type { MonthKey } from "./months";
import type { Entry, Template } from "./types";

export function resolveEntries(
  month: MonthKey,
  currentMonth: MonthKey,
  templates: readonly Template[],
  stored: readonly Entry[],
): Entry[] {
  const storedByTemplate = new Map(stored.map((e) => [e.templateId, e]));
  const generate = month >= currentMonth;

  return [...templates]
    .sort((a, b) => a.position - b.position)
    .flatMap((template) => {
      const entry = storedByTemplate.get(template.id);
      if (entry) return [entry];
      if (!generate || !template.active) return [];
      return [
        {
          templateId: template.id,
          amountCents: template.amountCents,
          paidAt: template.autoPaid
            ? `${month}-${String(Math.min(template.dueDay, 28)).padStart(2, "0")}`
            : null,
        },
      ];
    });
}
