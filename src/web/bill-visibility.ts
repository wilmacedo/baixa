import type { Bill } from "../shared/ledger";

interface VisibilityRules {
  showPaid: boolean;
  settling: ReadonlySet<string>;
  editingId: string | null;
}

export function isBillHidden(
  bill: Bill,
  { showPaid, settling, editingId }: VisibilityRules,
): boolean {
  return (
    bill.status === "paid" &&
    !showPaid &&
    !settling.has(bill.templateId) &&
    editingId !== bill.templateId
  );
}
