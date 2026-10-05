import type { ReactNode } from "react";
import type { Bill, Totals } from "../../shared/ledger";
import { formatCents } from "../../shared/money";
import type { MonthKey } from "../../shared/months";
import { monthName, plural } from "../format";
import { heroSize } from "../layout";
import styles from "./MonthSummary.module.css";
import { Odometer } from "./Odometer";

interface MonthSummaryProps {
  nav: ReactNode;
  month: MonthKey;
  totals: Totals;
  expenseCount: number;
  expenseCents: number;
  lateBills: Bill[];
  next: { day: number; bills: Bill[] } | undefined;
  loading: boolean;
  width: number;
  onShowLate: () => void;
}

const sum = (bills: readonly Bill[]) =>
  bills.reduce((total, bill) => total + bill.amountCents, 0);

export function MonthSummary({
  nav,
  month,
  totals,
  expenseCount,
  expenseCents,
  lateBills,
  next,
  loading,
  width,
  onShowLate,
}: MonthSummaryProps) {
  const name = monthName(month);
  const size = heroSize(width);
  const weight = Math.round(860 - totals.progress * 580);
  const stretch = Math.round(108 - totals.progress * 26);
  const hasTotal = totals.pendingCents + totals.paidCents > 0;
  const showDetails = !loading;

  return (
    <section aria-label="Resumo do mês" className={styles.summary}>
      <div className={styles.main}>
        {nav}
        <span className={styles.label}>falta pagar em {name}</span>
        <div
          className={styles.figure}
          style={{
            color: totals.pendingCents > 0 ? "var(--ink)" : "var(--graphite)",
          }}
        >
          <span
            aria-hidden="true"
            className={styles.currency}
            style={{ fontSize: Math.max(18, size * 0.19) }}
          >
            R$
          </span>
          {loading ? (
            <span
              role="status"
              aria-label="Carregando"
              className={styles.skeleton}
              style={{ fontSize: size }}
            />
          ) : (
            <span
              className={styles.number}
              style={{
                fontSize: size,
                fontVariationSettings: `"wght" ${weight}, "wdth" ${stretch}`,
              }}
            >
              <Odometer cents={totals.pendingCents} />
            </span>
          )}
          <span role="status" className={styles.srOnly}>
            {loading
              ? ""
              : `Falta pagar R$ ${formatCents(totals.pendingCents)}`}
          </span>
        </div>
      </div>

      <div className={styles.side}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>pago</span>
          <span className={styles.rowDetail}>
            {hasTotal ? `${Math.round(totals.progress * 100)}%` : ""}
          </span>
          <span
            className={styles.rowValue}
            style={{
              color: "var(--graphite)",
              fontVariationSettings: '"wght" 340, "wdth" 90',
            }}
          >
            <Odometer cents={totals.paidCents} delay={60} />
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>avulsos</span>
          <span className={styles.rowDetail}>
            {expenseCount > 0 ? plural(expenseCount, "gasto", "gastos") : ""}
          </span>
          <span
            className={styles.rowValue}
            style={{ fontVariationSettings: '"wght" 520, "wdth" 96' }}
          >
            <Odometer cents={expenseCents} delay={60} />
          </span>
        </div>
        {showDetails && lateBills.length > 0 && (
          <button
            type="button"
            className={`${styles.row} ${styles.late}`}
            onClick={onShowLate}
          >
            <span className={styles.rowLabel}>
              {plural(lateBills.length, "atrasada", "atrasadas")}
            </span>
            <span className={styles.rowDetail}>
              {lateBills.length === 1
                ? `${lateBills[0]?.name} · dia ${lateBills[0]?.dueDay}`
                : lateBills.map((bill) => bill.name).join(", ")}
            </span>
            <span className={styles.rowValue}>
              {formatCents(sum(lateBills))}
            </span>
          </button>
        )}
        {showDetails && next && (
          <div className={`${styles.row} ${styles.next}`}>
            <span className={styles.rowLabel}>próximo</span>
            <span className={styles.rowDetail}>
              {`dia ${next.day} · ${
                next.bills.length === 1
                  ? next.bills[0]?.name
                  : plural(next.bills.length, "conta", "contas")
              }`}
            </span>
            <span className={styles.rowValue}>
              {formatCents(sum(next.bills))}
            </span>
          </div>
        )}
        {showDetails && totals.pendingCount === 0 && (
          <div className={styles.allPaid}>
            Tudo pago em {name}. O mês ficou leve.
          </div>
        )}
      </div>
    </section>
  );
}
