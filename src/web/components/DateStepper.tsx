import type { Ref } from "react";
import styles from "./DateStepper.module.css";

interface DateStepperProps {
  label: string;
  canGoForward: boolean;
  onPrevious: () => void;
  onNext: () => void;
  compact?: boolean;
  focused?: boolean;
  stepperRef?: Ref<HTMLDivElement>;
  onFocus?: () => void;
}

export function DateStepper({
  label,
  canGoForward,
  onPrevious,
  onNext,
  compact = false,
  focused = false,
  stepperRef,
  onFocus,
}: DateStepperProps) {
  return (
    <div
      ref={stepperRef}
      role="spinbutton"
      tabIndex={compact ? undefined : 0}
      data-field="date"
      data-focused={focused}
      data-compact={compact}
      aria-label="Data do gasto"
      aria-valuetext={label}
      aria-valuenow={0}
      className={styles.stepper}
      onFocus={onFocus}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dia anterior"
        className={styles.step}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onPrevious}
      >
        ‹
      </button>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dia seguinte"
        disabled={!canGoForward}
        className={styles.step}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onNext}
      >
        ›
      </button>
    </div>
  );
}
