import type { MonthKey } from "../shared/months";
import type { Entry } from "../shared/types";
import type { Db } from "./db";

interface EntryRow {
  template_id: string;
  amount_cents: number;
  paid_at: string | null;
}

const toEntry = (row: EntryRow): Entry => ({
  templateId: row.template_id,
  amountCents: row.amount_cents,
  paidAt: row.paid_at,
});

export function createEntries(db: Db) {
  const selectMonth = db.prepare(
    `SELECT template_id, amount_cents, paid_at FROM entries
     WHERE month = ? ORDER BY template_id`,
  );
  const upsert = db.prepare(
    `INSERT INTO entries (month, template_id, amount_cents, paid_at)
     VALUES (@month, @template_id, @amount_cents, @paid_at)
     ON CONFLICT (month, template_id) DO UPDATE
     SET amount_cents = excluded.amount_cents, paid_at = excluded.paid_at`,
  );

  return {
    listForMonth: (month: MonthKey): Entry[] =>
      (selectMonth.all(month) as EntryRow[]).map(toEntry),

    save(month: MonthKey, entry: Entry): Entry {
      upsert.run({
        month,
        template_id: entry.templateId,
        amount_cents: entry.amountCents,
        paid_at: entry.paidAt,
      });
      return entry;
    },
  };
}

export type Entries = ReturnType<typeof createEntries>;
