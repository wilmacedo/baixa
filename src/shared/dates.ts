const MS_PER_DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseIsoDate(iso: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  return { year, month, day };
}

const utcTime = (iso: string) => {
  const { year, month, day } = parseIsoDate(iso);
  return Date.UTC(year, month - 1, day);
};

export function addDays(iso: string, days: number): string {
  const date = new Date(utcTime(iso) + days * MS_PER_DAY);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((utcTime(to) - utcTime(from)) / MS_PER_DAY);
}

export function weekday(iso: string): number {
  return new Date(utcTime(iso)).getUTCDay();
}
