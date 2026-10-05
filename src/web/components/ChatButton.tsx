import styles from "./ChatButton.module.css";

interface ChatButtonProps {
  compact: boolean;
  busy: boolean;
  onOpen: () => void;
}

export function ChatButton({ compact, busy, onOpen }: ChatButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      data-compact={compact}
      data-busy={busy}
      aria-label="Abrir assistente"
      title="Assistente (C)"
      onClick={onOpen}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path d="M4.5 5.5h15a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3.5V17H4.5A1.5 1.5 0 0 1 3 15.5V7a1.5 1.5 0 0 1 1.5-1.5Z" />
      </svg>
    </button>
  );
}
