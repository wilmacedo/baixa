import type { MonthKey, Today } from "./months";

export type EntryStatus = "paid" | "late" | "today" | "pending";

export interface DueEntry {
  month: MonthKey;
  dueDay: number;
  paid: boolean;
}

export function entryStatus(
  { month, dueDay, paid }: DueEntry,
  today: Today,
): EntryStatus {
  if (paid) return "paid";
  if (month < today.month) return "late";
  if (month > today.month) return "pending";
  if (dueDay < today.day) return "late";
  return dueDay === today.day ? "today" : "pending";
}
