import { z } from "zod";
import { CATEGORIES, GROUPS } from "../shared/types";

const MAX_AMOUNT_CENTS = 9_999_999_999;

export const amountCents = z.number().int().positive().max(MAX_AMOUNT_CENTS);

export const templateInput = z.object({
  name: z.string().trim().min(1).max(80),
  amountCents: z.number().int().nonnegative().max(MAX_AMOUNT_CENTS),
  dueDay: z.number().int().min(1).max(31),
  group: z.enum(GROUPS),
  autoPaid: z.boolean().optional(),
});

export const templatePatch = templateInput
  .extend({ active: z.boolean() })
  .partial();

export const entryInput = z.object({
  amountCents,
  paidAt: z.iso.date().nullable(),
});

export const expenseInput = z.object({
  description: z.string().trim().min(1).max(120),
  amountCents,
  category: z.enum(CATEGORIES),
  spentOn: z.iso.date(),
});

export const expenseCreate = expenseInput.extend({ id: z.uuid().optional() });
