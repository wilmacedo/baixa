import { formatCents } from "../../shared/money";
import type { MonthKey } from "../../shared/months";
import type { DateBucket } from "../date-buckets";
import { GROUP_LABELS, monthName } from "../format";
import { BillRow } from "./BillRow";
import styles from "./DateList.module.css";

interface DateListProps {
  month: MonthKey;
  buckets: DateBucket[];
  hiddenIds: ReadonlySet<string>;
  editingId: string | null;
  focusedId: string | null;
  failedIds: readonly string[];
  tabbableId: string | null;
  paidSummary: string;
  loading: boolean;
  onToggle: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onFocus: (templateId: string) => void;
}

export function DateList({
  month,
  buckets,
  hiddenIds,
  editingId,
  focusedId,
  failedIds,
  tabbableId,
  paidSummary,
  loading,
  onToggle,
  onEdit,
  onFocus,
}: DateListProps) {
  const empty = buckets.every((bucket) =>
    bucket.bills.every((b) => hiddenIds.has(b.templateId)),
  );

  return (
    <section aria-label="Contas por data" className={styles.list}>
      {buckets.map((bucket) => (
        <div key={bucket.id}>
          {bucket.bills.some((bill) => !hiddenIds.has(bill.templateId)) && (
            <h3 className={styles.section} data-tone={bucket.tone}>
              <span>{bucket.label}</span>
              <span className={styles.grow} />
              {bucket.sumCents > 0 && (
                <span className={styles.sum}>
                  {formatCents(bucket.sumCents)}
                </span>
              )}
            </h3>
          )}
          <ul className={styles.items}>
            {bucket.bills.map((bill) => (
              <BillRow
                key={bill.templateId}
                bill={bill}
                compact
                sub={`${GROUP_LABELS[bill.group].replace(" mensais", "")} · dia ${bill.dueDay}`}
                hidden={hiddenIds.has(bill.templateId)}
                focused={focusedId === bill.templateId}
                editing={editingId === bill.templateId}
                failed={failedIds.includes(bill.templateId)}
                tabbable={tabbableId === bill.templateId}
                onToggle={onToggle}
                onEdit={onEdit}
                onFocus={onFocus}
              />
            ))}
          </ul>
        </div>
      ))}
      {empty && !loading && (
        <div className={styles.empty}>
          <span className={styles.emptyTitle}>
            Nada pendente em {monthName(month)}.
          </span>
          <span className={styles.emptyCaption}>{paidSummary}</span>
        </div>
      )}
    </section>
  );
}
