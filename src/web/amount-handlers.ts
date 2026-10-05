import type { ChangeEvent, KeyboardEvent } from "react";
import { pasteText, typeKey } from "../shared/amount-input";

const AMOUNT_KEY = /^(\d|,|\.|Backspace)$/;

export function amountHandlers(raw: string, onChange: (raw: string) => void) {
  return {
    onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!AMOUNT_KEY.test(event.key)) return;
      event.preventDefault();
      onChange(typeKey(raw, event.key));
    },
    onChange(event: ChangeEvent<HTMLInputElement>) {
      onChange(pasteText(event.target.value));
    },
  };
}
