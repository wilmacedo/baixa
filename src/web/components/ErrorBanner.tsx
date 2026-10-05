import styles from "./ErrorBanner.module.css";

interface ErrorBannerProps {
  label: string;
  message: string;
  action: string;
  compact?: boolean;
  onAction: () => void;
}

export function ErrorBanner({
  label,
  message,
  action,
  compact = false,
  onAction,
}: ErrorBannerProps) {
  return (
    <div role="alert" className={styles.banner} data-compact={compact}>
      <span className={styles.tag}>{label}</span>
      <span className={styles.message}>{message}</span>
      <button type="button" className={styles.action} onClick={onAction}>
        {action}
      </button>
    </div>
  );
}
