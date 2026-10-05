import { useRef } from "react";
import type { Toast as ToastState } from "../use-toast";
import styles from "./Toast.module.css";

interface ToastProps {
  toast: ToastState | null;
  compact?: boolean;
  onUndo: () => void;
}

export function Toast({ toast, compact = false, onUndo }: ToastProps) {
  const lastShown = useRef<ToastState | null>(null);
  if (toast) lastShown.current = toast;
  const shown = lastShown.current;

  return (
    <div
      role="status"
      aria-live="polite"
      className={styles.toast}
      data-visible={toast !== null}
      data-compact={compact}
    >
      <span className={styles.text}>{shown?.text}</span>
      {shown?.undoable && (
        <button
          type="button"
          className={styles.undo}
          tabIndex={toast ? 0 : -1}
          onClick={onUndo}
        >
          desfazer <span className={styles.key}>Z</span>
        </button>
      )}
    </div>
  );
}
