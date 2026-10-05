import { type KeyboardEvent, useEffect, useRef } from "react";
import type { Bill } from "../../shared/ledger";
import { formatCents } from "../../shared/money";
import type { MonthKey, Today } from "../../shared/months";
import { GROUP_LABELS, monthName } from "../format";
import { type EntryEdit, useEntryEdit } from "../use-entry-edit";
import { useShake } from "../use-shake";
import { AmountField } from "./AmountField";
import styles from "./EditEntry.module.css";
import { SegmentedControl } from "./SegmentedControl";

interface EditEntryProps {
  bill: Bill;
  month: MonthKey;
  today: Today;
  size: number;
  onSave: (edit: EntryEdit) => void;
  onCancel: () => void;
}

export function EditEntry({
  bill,
  month,
  today,
  size,
  onSave,
  onCancel,
}: EditEntryProps) {
  const edit = useEntryEdit({ bill, month, today });
  const amountRef = useRef<HTMLInputElement>(null);
  const shake = useShake();

  useEffect(() => amountRef.current?.focus(), []);

  const save = () => {
    const result = edit.result();
    if (!result) {
      shake.shake();
      amountRef.current?.focus();
      return;
    }
    onSave(result);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    const target = event.target as HTMLElement;
    if (
      event.key === "Enter" &&
      target.tagName !== "BUTTON" &&
      target.getAttribute("type") !== "checkbox"
    ) {
      event.preventDefault();
      save();
    }
  };

  return (
    <section
      aria-label="Editar lançamento"
      className={styles.panel}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.bar}>
        <span className={styles.tag}>editando</span>
        <span className={styles.name}>{bill.name}</span>
        <span className={styles.meta}>
          só em {monthName(month)} · {GROUP_LABELS[bill.group].toLowerCase()} ·
          dia {bill.dueDay}
        </span>
        <span className={styles.rule} />
        <span className={styles.hint}>enter salva · esc cancela</span>
      </div>

      <div className={styles.amount}>
        <AmountField
          raw={edit.raw}
          onChange={edit.setRaw}
          size={size}
          label="Valor deste mês"
          inputRef={amountRef}
          shake={shake.transform}
        />
      </div>

      <div className={styles.footer}>
        <span className={styles.default}>
          padrão {formatCents(bill.defaultCents)}{" "}
          <span
            className={styles.diff}
            style={{
              color:
                edit.delta > 0
                  ? "var(--red)"
                  : edit.delta < 0
                    ? "var(--ink)"
                    : "var(--graphite)",
            }}
          >
            {edit.delta === 0
              ? "· igual ao padrão"
              : `· ${edit.delta > 0 ? "+" : "−"}${formatCents(Math.abs(edit.delta))} neste mês`}
          </span>
        </span>
        <button
          type="button"
          className={styles.reset}
          disabled={edit.delta === 0}
          onClick={edit.reset}
        >
          voltar ao padrão
        </button>
        <SegmentedControl
          label="Situação"
          value={edit.paid ? "paid" : "pending"}
          onChange={(value) => edit.setPaid(value === "paid")}
          options={[
            { value: "pending", label: "pendente", tone: "ink" },
            { value: "paid", label: `pago ${edit.paidDate}`, tone: "graphite" },
          ]}
        />
        <label className={styles.apply}>
          <input
            type="checkbox"
            checked={edit.applyToTemplate}
            onChange={(event) => edit.setApplyToTemplate(event.target.checked)}
          />
          <span>usar como novo padrão a partir de {edit.nextMonth}</span>
        </label>
        <span className={styles.grow} />
        <button type="button" className={styles.cancel} onClick={onCancel}>
          cancelar
        </button>
        <button type="button" className={styles.save} onClick={save}>
          salvar
        </button>
      </div>
    </section>
  );
}
