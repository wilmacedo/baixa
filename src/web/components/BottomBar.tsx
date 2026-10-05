import styles from "./BottomBar.module.css";
import type { Screen } from "./Header";

interface BottomBarProps {
  screen: Screen;
  onScreen: (screen: Screen) => void;
  onNewExpense: () => void;
}

export function BottomBar({ screen, onScreen, onNewExpense }: BottomBarProps) {
  return (
    <nav aria-label="Navegação" className={styles.bar}>
      <button
        type="button"
        className={styles.tab}
        aria-current={screen === "month" ? "page" : undefined}
        onClick={() => onScreen("month")}
      >
        mês
      </button>
      <button type="button" className={styles.add} onClick={onNewExpense}>
        <span className={styles.plus}>+</span>
        gasto
      </button>
      <button
        type="button"
        className={styles.tab}
        aria-current={screen === "recurring" ? "page" : undefined}
        onClick={() => onScreen("recurring")}
      >
        recorrentes
      </button>
    </nav>
  );
}
