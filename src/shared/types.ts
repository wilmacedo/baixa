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
