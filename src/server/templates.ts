import { randomUUID } from "node:crypto";
import type { Group, Template } from "../shared/types";
import type { Db } from "./db";

export interface TemplateInput {
  name: string;
  amountCents: number;
  dueDay: number;
  group: Group;
}

export type TemplatePatch = Partial<TemplateInput & { active: boolean }>;

interface TemplateRow {
  id: string;
  name: string;
  amount_cents: number;
  due_day: number;
  group: Group;
  active: number;
  position: number;
}

const toTemplate = (row: TemplateRow): Template => ({
  id: row.id,
  name: row.name,
  amountCents: row.amount_cents,
  dueDay: row.due_day,
  group: row.group,
  active: row.active === 1,
  position: row.position,
});

export function createTemplates(db: Db) {
  const selectAll = db.prepare(
    'SELECT id, name, amount_cents, due_day, "group", active, position FROM templates ORDER BY position',
  );
  const selectOne = db.prepare(
    'SELECT id, name, amount_cents, due_day, "group", active, position FROM templates WHERE id = ?',
  );
  const insert = db.prepare(
    `INSERT INTO templates (id, name, amount_cents, due_day, "group", active, position)
     VALUES (@id, @name, @amount_cents, @due_day, @group, 1,
             (SELECT COALESCE(MAX(position), 0) + 1 FROM templates))`,
  );
  const update = db.prepare(
    `UPDATE templates
     SET name = @name, amount_cents = @amount_cents, due_day = @due_day,
         "group" = @group, active = @active
     WHERE id = @id`,
  );

  const get = (id: string): Template | undefined => {
    const row = selectOne.get(id) as TemplateRow | undefined;
    return row && toTemplate(row);
  };

  return {
    list: (): Template[] => (selectAll.all() as TemplateRow[]).map(toTemplate),

    get,

    create(input: TemplateInput): Template {
      const id = randomUUID();
      insert.run({
        id,
        name: input.name,
        amount_cents: input.amountCents,
        due_day: input.dueDay,
        group: input.group,
      });
      return get(id) as Template;
    },

    update(id: string, patch: TemplatePatch): Template | undefined {
      const current = get(id);
      if (!current) return undefined;
      const next = { ...current, ...patch };
      update.run({
        id,
        name: next.name,
        amount_cents: next.amountCents,
        due_day: next.dueDay,
        group: next.group,
        active: next.active ? 1 : 0,
      });
      return get(id);
    },
  };
}

export type Templates = ReturnType<typeof createTemplates>;
