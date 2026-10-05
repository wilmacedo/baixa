import type { Bill, Totals } from "../../shared/ledger";
import { formatCents } from "../../shared/money";
import type { MonthKey } from "../../shared/months";
import { monthName, plural } from "../format";
import styles from "./MobileSummary.module.css";
import { Odometer } from "./Odometer";

interface MobileSummaryProps {
  month: MonthKey;
  totals: Totals;
  expenseCents: number;
  lateBills: Bill[];
  loading: boolean;
  width: number;
}

export function MobileSummary({
  month,
  totals,
  expenseCents,
  lateBills,
  loading,
  width,
}: MobileSummaryProps) {
  const size = Math.max(38, Math.min(72, (width - 40) / 6.3));
  const weight = Math.round(860 - totals.progress * 580);
  const stretch = Math.round(108 - totals.progress * 26);

  return (
    <section aria-label="Resumo do mês" className={styles.summary}>
      <span className={styles.label}>falta pagar em {monthName(month)}</span>
      <div
        className={styles.figure}
        style={{
          color: totals.pendingCents > 0 ? "var(--ink)" : "var(--graphite)",
        }}
      >
        <span
          aria-hidden="true"
          className={styles.currency}
          style={{ fontSize: 18 }}
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
            role="status"
            aria-label={`Falta pagar R$ ${formatCents(totals.pendingCents)}`}
            className={styles.number}
            style={{
              fontSize: size,
              fontVariationSettings: `"wght" ${weight}, "wdth" ${stretch}`,
            }}
          >
            <Odometer cents={totals.pendingCents} />
          </span>
        )}
      </div>
      <div className={styles.stats}>
        <span>pago {formatCents(totals.paidCents)}</span>
        <span>avulsos {formatCents(expenseCents)}</span>
      </div>
      {!loading && lateBills.length > 0 && (
        <div className={styles.late}>
          {plural(lateBills.length, "atrasada", "atrasadas")} ·{" "}
          {lateBills.length === 1
            ? `${lateBills[0]?.name} · dia ${lateBills[0]?.dueDay}`
            : lateBills.map((bill) => bill.name).join(", ")}
        </div>
      )}
    </section>
  );
}
