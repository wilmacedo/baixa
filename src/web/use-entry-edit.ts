import { useState } from "react";
import { type Bill, paymentDate } from "../shared/ledger";
import { parseRaw, toRaw } from "../shared/money";
import { addMonths, type MonthKey, type Today } from "../shared/months";
import { monthName, paidOn } from "./format";

export interface EntryEdit {
  amountCents: number;
  paid: boolean;
  applyToTemplate: boolean;
}

interface EntryEditOptions {
  bill: Bill;
  month: MonthKey;
  today: Today;
}

export function useEntryEdit({ bill, month, today }: EntryEditOptions) {
  const [raw, setRaw] = useState(toRaw(bill.amountCents));
  const [paid, setPaid] = useState(bill.status === "paid");
  const [applyToTemplate, setApplyToTemplate] = useState(false);

  const amountCents = parseRaw(raw);

  return {
    raw,
    setRaw,
    paid,
    setPaid,
    applyToTemplate,
    setApplyToTemplate,
    amountCents,
    delta: amountCents - bill.defaultCents,
    paidDate: paidOn(bill.paidAt ?? paymentDate(month, bill.dueDay, today)),
    nextMonth: monthName(addMonths(month, 1)),
    reset: () => setRaw(toRaw(bill.defaultCents)),
    result: (): EntryEdit | null =>
      amountCents > 0 ? { amountCents, paid, applyToTemplate } : null,
  };
}
