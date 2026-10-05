import type { Db } from "../../src/server/db";
import { createEntries } from "../../src/server/entries";
import { createExpenses } from "../../src/server/expenses";
import { createTemplates } from "../../src/server/templates";
import type { ImportPlan } from "./plan";

export interface ImportCounts {
  templates: number;
  entries: number;
  expenses: number;
}

export function applyPlan(db: Db, plan: ImportPlan): ImportCounts {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM templates").get() as {
    n: number;
  };
  if (existing.n > 0) {
    throw new Error(
      "The database already has data. Refusing to import into it.",
    );
  }

  const templates = createTemplates(db);
  const entries = createEntries(db);
  const expenses = createExpenses(db);

  db.transaction(() => {
    const ids = new Map<string, string>();
    for (const planned of plan.templates) {
      const created = templates.create({
        name: planned.name,
        amountCents: planned.amountCents,
        dueDay: planned.dueDay,
        group: planned.group,
        autoPaid: planned.autoPaid,
      });
      if (!planned.active) templates.update(created.id, { active: false });
      ids.set(planned.key, created.id);
    }

    for (const entry of plan.entries) {
      const templateId = ids.get(entry.templateKey);
      if (!templateId) continue;
      entries.save(entry.month, {
        templateId,
        amountCents: entry.amountCents,
        paidAt: entry.paidAt,
      });
    }

    for (const expense of plan.expenses) {
      expenses.create({
        description: expense.description,
        amountCents: expense.amountCents,
        category: expense.category,
        spentOn: expense.spentOn,
      });
    }
  })();

  return {
    templates: plan.templates.length,
    entries: plan.entries.length,
    expenses: plan.expenses.length,
  };
}
