import styles from "./BillRowSkeleton.module.css";

export function BillRowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <li aria-hidden="true" className={styles.row} data-compact={compact}>
      <span className={styles.circle} />
      <span className={styles.day} />
      <span className={styles.name} />
      <span className={styles.amount} />
    </li>
  );
}
