import type { CSSProperties } from "react";
import type { MonthKey } from "../../shared/months";
import { monthShort } from "../format";
import styles from "./MobileHeader.module.css";

interface MobileHeaderProps {
  month: MonthKey | null;
  canGoBack: boolean;
  slide: CSSProperties;
  onPrevious: () => void;
  onNext: () => void;
  onToggleTheme: () => void;
}

export function MobileHeader({
  month,
  canGoBack,
  slide,
  onPrevious,
  onNext,
  onToggleTheme,
}: MobileHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        baixa<span className={styles.dot}>.</span>
      </div>
      <div className={styles.grow} />
      {month && (
        <>
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
            <div className={styles.month} style={slide}>
              {monthShort(month)}
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
        </>
      )}
      <button
        type="button"
        className={styles.theme}
        aria-label="Trocar tema"
        onClick={onToggleTheme}
      >
        <span aria-hidden="true" className={styles.themeIcon} />
      </button>
    </header>
  );
}
