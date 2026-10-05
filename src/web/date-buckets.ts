import type { Bill } from "../shared/ledger";
import type { MonthKey, Today } from "../shared/months";

export interface DateBucket {
  id: string;
  label: string;
  tone: "red" | "ink" | "text" | "graphite";
  bills: Bill[];
  sumCents: number;
}

const UPCOMING_DAYS = 7;
const FIRST_HALF_END = 15;

function bucketFor(bill: Bill, month: MonthKey, today: Today) {
  if (month === today.month) {
    if (bill.status === "late") return "late";
    if (bill.dueDay <= today.day) return "untilToday";
    return bill.dueDay <= today.day + UPCOMING_DAYS ? "upcoming" : "later";
  }
  if (month < today.month) return bill.status === "late" ? "late" : "paid";
  return bill.dueDay <= FIRST_HALF_END ? "firstHalf" : "secondHalf";
}

const BUCKETS: Record<string, Pick<DateBucket, "label" | "tone">> = {
  late: { label: "atrasadas", tone: "red" },
  untilToday: { label: "até hoje", tone: "text" },
  upcoming: { label: "próximos 7 dias", tone: "ink" },
  later: { label: "mais adiante", tone: "text" },
  paid: { label: "pagas", tone: "graphite" },
  firstHalf: { label: "1ª quinzena", tone: "ink" },
  secondHalf: { label: "2ª quinzena", tone: "text" },
};

const ORDER = {
  current: ["late", "untilToday", "upcoming", "later"],
  past: ["late", "paid"],
  future: ["firstHalf", "secondHalf"],
};

export function bucketBills(
  bills: readonly Bill[],
  month: MonthKey,
  today: Today,
): DateBucket[] {
  const kind =
    month === today.month ? "current" : month < today.month ? "past" : "future";
  const sorted = [...bills].sort(
    (a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name),
  );

  return ORDER[kind].flatMap((id) => {
    const inBucket = sorted.filter(
      (bill) => bucketFor(bill, month, today) === id,
    );
    if (inBucket.length === 0) return [];

    const sumCents = inBucket
      .filter((bill) => bill.status !== "paid")
      .reduce((sum, bill) => sum + bill.amountCents, 0);
    const { label, tone } = BUCKETS[id] ?? { label: id, tone: "text" as const };
    return [{ id, label, tone, bills: inBucket, sumCents }];
  });
}
