import { daysBetween, parseIsoDate, weekday } from "../shared/dates";
import { type MonthKey, parseMonthKey } from "../shared/months";
import type { Category, Group } from "../shared/types";

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const MONTHS_SHORT = [
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

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export const GROUP_LABELS: Record<Group, string> = {
  fixed: "Contas fixas",
  charges: "Cobranças mensais",
  cards: "Cartões",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  home: "Casa",
  groceries: "Mercado",
  health: "Saúde",
  transport: "Transporte",
  leisure: "Lazer",
  other: "Outros",
};

export const CATEGORY_HOTKEYS: Record<Category, string> = {
  home: "c",
  groceries: "m",
  health: "s",
  transport: "t",
  leisure: "l",
  other: "o",
};

export const monthName = (key: MonthKey) =>
  MONTHS[parseMonthKey(key).monthIndex] ?? "";

export const monthShort = (key: MonthKey) => {
  const { year, monthIndex } = parseMonthKey(key);
  return `${MONTHS_SHORT[monthIndex]} ${year}`;
};

export const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export function paidOn(iso: string): string {
  const { month, day } = parseIsoDate(iso);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

export function dateLabel(iso: string, todayIso: string): string {
  const { month, day } = parseIsoDate(iso);
  const offset = daysBetween(todayIso, iso);
  const prefix =
    offset === 0
      ? "hoje"
      : offset === -1
        ? "ontem"
        : WEEKDAYS_SHORT[weekday(iso)];
  return `${prefix}, ${day} ${MONTHS_SHORT[month - 1]}`;
}
