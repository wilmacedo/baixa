import { formatCents } from "../../shared/money";
import styles from "./Odometer.module.css";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const STAGGER_MS = 24;

interface OdometerProps {
  cents: number;
  delay?: number;
}

export function Odometer({ cents, delay = 0 }: OdometerProps) {
  const characters = [...formatCents(cents)];

  return (
    <span aria-hidden="true" className={styles.odometer}>
      {characters.map((character, index) => {
        const position = characters.length - index;
        if (character < "0" || character > "9") {
          return (
            <span key={`s${position}${character}`} className={styles.separator}>
              {character}
            </span>
          );
        }
        return (
          <span key={`d${position}`} className={styles.slot}>
            <span
              className={styles.strip}
              style={{
                transform: `translateY(${-Number(character)}em)`,
                transitionDelay: `${delay + position * STAGGER_MS}ms`,
              }}
            >
              {DIGITS.map((digit) => (
                <span key={digit} className={styles.digit}>
                  {digit}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
