import type { Ref } from "react";
import { displayRaw, ghostCents } from "../../shared/amount-input";
import { amountHandlers } from "../amount-handlers";
import styles from "./AmountField.module.css";

interface AmountFieldProps {
  raw: string;
  onChange: (raw: string) => void;
  size: number;
  label: string;
  inputRef?: Ref<HTMLInputElement>;
  numberRef?: Ref<HTMLSpanElement>;
  field?: string;
  shake?: string;
  onFocus?: () => void;
}

export function AmountField({
  raw,
  onChange,
  size,
  label,
  inputRef,
  numberRef,
  field,
  shake = "none",
  onFocus,
}: AmountFieldProps) {
  const display = displayRaw(raw);

  const handlers = amountHandlers(raw, onChange);

  return (
    <label className={styles.field}>
      <span
        aria-hidden="true"
        className={styles.currency}
        style={{ fontSize: Math.max(18, size * 0.19) }}
      >
        R$
      </span>
      <span
        ref={numberRef}
        className={styles.number}
        style={{ fontSize: size, transform: shake }}
      >
        <span className={styles.input}>
          <span aria-hidden="true" className={styles.mirror}>
            {display || "0"}
          </span>
          <input
            ref={inputRef}
            data-field={field}
            aria-label={label}
            inputMode="decimal"
            autoComplete="off"
            size={1}
            placeholder="0"
            value={display}
            onKeyDown={handlers.onKeyDown}
            onChange={handlers.onChange}
            onFocus={onFocus}
          />
        </span>
        <span aria-hidden="true" className={styles.ghost}>
          {ghostCents(raw)}
        </span>
      </span>
    </label>
  );
}
