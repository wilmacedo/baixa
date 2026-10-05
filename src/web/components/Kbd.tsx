import type { ReactNode } from "react";
import styles from "./Kbd.module.css";

interface KbdProps {
  children: ReactNode;
  tone?: "plain" | "inverse";
}

export function Kbd({ children, tone = "plain" }: KbdProps) {
  return (
    <kbd className={styles.kbd} data-tone={tone}>
      {children}
    </kbd>
  );
}
