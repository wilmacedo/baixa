import type { Today } from "../../shared/months";
import { todayLong } from "../format";
import styles from "./Header.module.css";
import { Kbd } from "./Kbd";

export type Screen = "month" | "recurring";

interface HeaderProps {
  screen: Screen;
  today: Today;
  wide: boolean;
  themeName: string;
  onScreen: (screen: Screen) => void;
  onToggleTheme: () => void;
  onHelp: () => void;
  onNewExpense: () => void;
}

const TABS: Array<{ screen: Screen; label: string; key: string }> = [
  { screen: "month", label: "mês", key: "M" },
  { screen: "recurring", label: "recorrentes", key: "R" },
];

export function Header({
  screen,
  today,
  wide,
  themeName,
  onScreen,
  onToggleTheme,
  onHelp,
  onNewExpense,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        baixa<span className={styles.dot}>.</span>
      </div>
      <nav aria-label="Telas" className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.screen}
            type="button"
            className={styles.tab}
            aria-current={screen === tab.screen ? "page" : undefined}
            onClick={() => onScreen(tab.screen)}
          >
            {tab.label}
            <Kbd>{tab.key}</Kbd>
          </button>
        ))}
      </nav>
      <div className={styles.grow} />
      {wide && <span className={styles.today}>{todayLong(today)}</span>}
      <button
        type="button"
        className={styles.action}
        aria-label="Trocar tema"
        onClick={onToggleTheme}
      >
        <span aria-hidden="true" className={styles.themeIcon} />
        {themeName}
      </button>
      <button
        type="button"
        className={styles.help}
        aria-label="Atalhos de teclado"
        onClick={onHelp}
      >
        ?
      </button>
      <button type="button" className={styles.new} onClick={onNewExpense}>
        novo gasto
        <Kbd tone="inverse">N</Kbd>
      </button>
    </header>
  );
}
