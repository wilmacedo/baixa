export type MonthKey = string;

export interface Today {
  month: MonthKey;
  day: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function monthKey(year: number, monthIndex: number): MonthKey {
  return `${year}-${pad(monthIndex + 1)}`;
}

export function parseMonthKey(key: MonthKey): {
  year: number;
  monthIndex: number;
} {
  const [year = 0, month = 1] = key.split("-").map(Number);
  return { year, monthIndex: month - 1 };
}

export function isMonthKey(value: string): value is MonthKey {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addMonths(key: MonthKey, count: number): MonthKey {
  const { year, monthIndex } = parseMonthKey(key);
  const total = year * 12 + monthIndex + count;
  return monthKey(Math.floor(total / 12), ((total % 12) + 12) % 12);
}

export function todayOf(date: Date): Today {
  return {
    month: monthKey(date.getFullYear(), date.getMonth()),
    day: date.getDate(),
  };
}
