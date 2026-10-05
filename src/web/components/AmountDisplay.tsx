import { displayRaw, ghostCents } from "../../shared/amount-input";
import styles from "./AmountDisplay.module.css";

interface AmountDisplayProps {
  raw: string;
  width: number;
  shake?: string;
}

export function AmountDisplay({
  raw,
  width,
  shake = "none",
}: AmountDisplayProps) {
  const size = Math.min(68, Math.max(44, (width - 70) / 5.6));

  return (
    <div className={styles.display} style={{ transform: shake }}>
      <span aria-hidden="true" className={styles.currency}>
        R$
      </span>
      <span
        aria-live="polite"
        className={styles.number}
        style={{ fontSize: size }}
      >
        {displayRaw(raw) || "0"}
        <span className={styles.ghost}>{ghostCents(raw)}</span>
      </span>
    </div>
  );
}
