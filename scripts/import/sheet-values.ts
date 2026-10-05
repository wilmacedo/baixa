import { normalizeText } from "../../src/shared/category";
import { addDays } from "../../src/shared/dates";
import type { MonthKey } from "../../src/shared/months";

export function parseAmountCents(text: string): number | null {
  const cleaned = text.replace(/R\$/g, "").replace(/[\s ]/g, "");
  if (!/^[\d.,]+$/.test(cleaned)) return null;

  const comma = cleaned.lastIndexOf(",");
  const whole = (comma >= 0 ? cleaned.slice(0, comma) : cleaned).replace(
    /\./g,
    "",
  );
  const fraction = comma >= 0 ? cleaned.slice(comma + 1) : "";
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(fraction)) return null;

  return (
    Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0").slice(0, 2))
  );
}

export function parseSheetDate(text: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(text.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = match[3] as string;
  const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const valid = month >= 1 && month <= 12 && addDays(iso, 0) === iso;
  return valid ? iso : null;
}

const MONTH_NAMES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function monthFromTabName(name: string): MonthKey | null {
  const match =
    /(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*[^\d]*(\d{4}|\d{2})/.exec(
      normalizeText(name),
    );
  if (!match) return null;

  const month = MONTH_NAMES.indexOf(match[1] as string) + 1;
  const rawYear = match[2] as string;
  const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
  return `${year}-${String(month).padStart(2, "0")}`;
}
