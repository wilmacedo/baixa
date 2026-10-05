import { type EntryStatus, entryStatus } from "./entry-status";
import type { MonthKey, Today } from "./months";
import type { Entry, Group, Template } from "./types";

export interface Bill {
  templateId: string;
  name: string;
  group: Group;
  dueDay: number;
  amountCents: number;
  defaultCents: number;
  paidAt: string | null;
  status: EntryStatus;
  adjusted: boolean;
  daysLate: number;
}

export interface Totals {
  pendingCents: number;
  paidCents: number;
  pendingCount: number;
  paidCount: number;
  lateCount: number;
  progress: number;
}

export function buildBills(
  month: MonthKey,
  today: Today,
  templates: readonly Template[],
  entries: readonly Entry[],
): Bill[] {
  const byId = new Map(templates.map((t) => [t.id, t]));

  return entries.flatMap((entry) => {
    const template = byId.get(entry.templateId);
    if (!template) return [];

    const status = entryStatus(
      { month, dueDay: template.dueDay, paid: entry.paidAt !== null },
      today,
    );
    return [
      {
        templateId: template.id,
        name: template.name,
        group: template.group,
        dueDay: template.dueDay,
        amountCents: entry.amountCents,
        defaultCents: template.amountCents,
        paidAt: entry.paidAt,
        status,
        adjusted:
          template.amountCents > 0 &&
          entry.amountCents !== template.amountCents,
        daysLate:
          status === "late" && month === today.month
            ? today.day - template.dueDay
            : 0,
      },
    ];
  });
}

export const byDueDay = (a: Bill, b: Bill) =>
  a.dueDay - b.dueDay || a.name.localeCompare(b.name);

export function billsByGroup(bills: readonly Bill[]): Record<Group, Bill[]> {
  const groups: Record<Group, Bill[]> = { fixed: [], charges: [], cards: [] };
  for (const bill of [...bills].sort(byDueDay)) groups[bill.group].push(bill);
  return groups;
}

export function summarize(bills: readonly Bill[]): Totals {
  let pendingCents = 0;
  let paidCents = 0;
  let pendingCount = 0;
  let lateCount = 0;

  for (const bill of bills) {
    if (bill.status === "paid") {
      paidCents += bill.amountCents;
      continue;
    }
    pendingCents += bill.amountCents;
    pendingCount += 1;
    if (bill.status === "late") lateCount += 1;
  }

  const total = pendingCents + paidCents;
  return {
    pendingCents,
    paidCents,
    pendingCount,
    paidCount: bills.length - pendingCount,
    lateCount,
    progress: total > 0 ? paidCents / total : 1,
  };
}

export function nextDue(
  bills: readonly Bill[],
): { day: number; bills: Bill[] } | undefined {
  const upcoming = bills.filter(
    (b) => b.status === "pending" || b.status === "today",
  );
  if (upcoming.length === 0) return undefined;

  const day = Math.min(...upcoming.map((b) => b.dueDay));
  return { day, bills: upcoming.filter((b) => b.dueDay === day) };
}

export function paymentDate(
  month: MonthKey,
  dueDay: number,
  today: Today,
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return month >= today.month
    ? `${today.month}-${pad(today.day)}`
    : `${month}-${pad(dueDay)}`;
}
