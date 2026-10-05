import type { ChangeEvent, KeyboardEvent, Ref } from "react";
import {
  displayRaw,
  ghostCents,
  pasteText,
  typeKey,
} from "../../shared/amount-input";
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

const AMOUNT_KEY = /^(\d|,|\.|Backspace)$/;

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

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (!AMOUNT_KEY.test(event.key)) return;
    event.preventDefault();
    onChange(typeKey(raw, event.key));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange(pasteText(event.target.value));

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
            onKeyDown={handleKeyDown}
            onChange={handleChange}
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
