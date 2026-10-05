import type { CSSProperties } from "react";
import { type MonthKey, parseMonthKey } from "../../shared/months";
import { monthName } from "../format";
import { Kbd } from "./Kbd";
import styles from "./MonthNav.module.css";

interface MonthNavProps {
  month: MonthKey;
  currentMonth: MonthKey;
  canGoBack: boolean;
  slide: CSSProperties;
  onPrevious: () => void;
  onNext: () => void;
  onCurrent: () => void;
}

export function MonthNav({
  month,
  currentMonth,
  canGoBack,
  slide,
  onPrevious,
  onNext,
  onCurrent,
}: MonthNavProps) {
  return (
    <div className={styles.nav}>
      <button
        type="button"
        className={styles.step}
        aria-label="Mês anterior"
        disabled={!canGoBack}
        onClick={onPrevious}
      >
        ‹
      </button>
      <div className={styles.clip}>
        <div className={styles.title} style={slide}>
          <h1 className={styles.month}>{monthName(month)}</h1>
          <span className={styles.year}>{parseMonthKey(month).year}</span>
        </div>
      </div>
      <button
        type="button"
        className={styles.step}
        aria-label="Próximo mês"
        onClick={onNext}
      >
        ›
      </button>
      <span aria-hidden="true" className={styles.keys}>
        <Kbd>[</Kbd>
        <Kbd>]</Kbd>
      </span>
      {month !== currentMonth && (
        <button type="button" className={styles.back} onClick={onCurrent}>
          voltar para {monthName(currentMonth)}
          <Kbd tone="inverse">H</Kbd>
        </button>
      )}
    </div>
  );
}
