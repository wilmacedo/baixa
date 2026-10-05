import type { Bill } from "../../shared/ledger";
import { formatCents } from "../../shared/money";
import { billTag } from "../format";
import styles from "./BillRow.module.css";

interface BillRowProps {
  bill: Bill;
  compact?: boolean;
  sub?: string;
  hidden?: boolean;
  focused?: boolean;
  editing?: boolean;
  failed?: boolean;
  tabbable?: boolean;
  onToggle: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onFocus: (templateId: string) => void;
}

export function BillRow({
  bill,
  compact = false,
  sub,
  hidden = false,
  focused = false,
  editing = false,
  failed = false,
  tabbable = false,
  onToggle,
  onEdit,
  onFocus,
}: BillRowProps) {
  const status = failed ? "error" : bill.status;
  const paid = bill.status === "paid";
  const amount = formatCents(bill.amountCents);
  const tag = billTag(bill, { editing, failed });
  const highlighted = focused || editing;

  const state = paid
    ? "paga"
    : bill.status === "late"
      ? "atrasada"
      : bill.status === "today"
        ? "vence hoje"
        : "pendente";

  return (
    <li
      data-bill={bill.templateId}
      inert={hidden}
      className={styles.row}
      data-status={status}
      data-hidden={hidden}
      data-focused={highlighted}
      data-compact={compact}
    >
      <div className={styles.clip}>
        <div className={styles.inner}>
          <span aria-hidden="true" className={styles.highlight} />
          <button
            type="button"
            data-role="mark"
            tabIndex={-1}
            aria-pressed={paid}
            aria-label={`${bill.name}, R$ ${amount}. ${paid ? "Paga. Marcar como pendente" : "Marcar como paga"}`}
            className={styles.mark}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onToggle(bill.templateId)}
          >
            <span className={styles.circle}>
              {status === "error" ? (
                <span className={styles.bang}>!</span>
              ) : (
                <svg
                  className={styles.check}
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <polyline points="3.4,8.6 6.8,11.6 12.6,4.6" />
                </svg>
              )}
            </span>
          </button>
          {!compact && (
            <span aria-hidden="true" className={styles.day}>
              {String(bill.dueDay).padStart(2, "0")}
            </span>
          )}
          <button
            type="button"
            data-role="main"
            tabIndex={tabbable || focused ? 0 : -1}
            aria-label={`${bill.name}, dia ${bill.dueDay}, R$ ${amount}, ${state}. Editar valor do mês`}
            className={styles.main}
            onClick={() => onEdit(bill.templateId)}
            onFocus={() => onFocus(bill.templateId)}
          >
            <span className={styles.top}>
              <span className={styles.name}>{bill.name}</span>
              {tag && <span className={styles.tag}>{tag}</span>}
            </span>
            {sub && <span className={styles.sub}>{sub}</span>}
          </button>
          <span className={styles.amount}>{amount}</span>
          <span aria-hidden="true" className={styles.strike} />
        </div>
      </div>
    </li>
  );
}
