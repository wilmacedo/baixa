import type { MonthKey } from "./months";

export const GROUPS = ["fixed", "charges", "cards"] as const;
export type Group = (typeof GROUPS)[number];

export const CATEGORIES = [
  "home",
  "groceries",
  "health",
  "transport",
  "leisure",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Template {
  id: string;
  name: string;
  amountCents: number;
  dueDay: number;
  group: Group;
  active: boolean;
  position: number;
}

export interface Entry {
  templateId: string;
  amountCents: number;
  paidAt: string | null;
}

export interface Expense {
  id: string;
  description: string;
  amountCents: number;
  category: Category;
  spentOn: string;
}

export interface TemplateInput {
  name: string;
  amountCents: number;
  dueDay: number;
  group: Group;
}

export type TemplatePatch = Partial<TemplateInput & { active: boolean }>;

export interface ExpenseInput {
  description: string;
  amountCents: number;
  category: Category;
  spentOn: string;
}

export interface MonthData {
  month: MonthKey;
  templates: Template[];
  entries: Entry[];
  expenses: Expense[];
}
