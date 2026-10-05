import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { type Bill, paymentDate } from "../../shared/ledger";
import { formatCents, parseRaw, toRaw } from "../../shared/money";
import { addMonths, type MonthKey, type Today } from "../../shared/months";
import { GROUP_LABELS, monthName, paidOn } from "../format";
import { useShake } from "../use-shake";
import { AmountField } from "./AmountField";
import styles from "./EditEntry.module.css";
import { SegmentedControl } from "./SegmentedControl";

export interface EntryEdit {
  amountCents: number;
  paid: boolean;
  applyToTemplate: boolean;
}

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
  const [raw, setRaw] = useState(toRaw(bill.amountCents));
  const [paid, setPaid] = useState(bill.status === "paid");
  const [applyToTemplate, setApplyToTemplate] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const shake = useShake();

  useEffect(() => amountRef.current?.focus(), []);

  const amountCents = parseRaw(raw);
  const delta = amountCents - bill.defaultCents;
  const paidDate = paidOn(
    bill.paidAt ?? paymentDate(month, bill.dueDay, today),
  );
  const nextMonth = monthName(addMonths(month, 1));

  const save = () => {
    if (amountCents <= 0) {
      shake.shake();
      amountRef.current?.focus();
      return;
    }
    onSave({ amountCents, paid, applyToTemplate });
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
          raw={raw}
          onChange={setRaw}
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
                delta > 0
                  ? "var(--red)"
                  : delta < 0
                    ? "var(--ink)"
                    : "var(--graphite)",
            }}
          >
            {delta === 0
              ? "· igual ao padrão"
              : `· ${delta > 0 ? "+" : "−"}${formatCents(Math.abs(delta))} neste mês`}
          </span>
        </span>
        <button
          type="button"
          className={styles.reset}
          disabled={delta === 0}
          onClick={() => setRaw(toRaw(bill.defaultCents))}
        >
          voltar ao padrão
        </button>
        <SegmentedControl
          label="Situação"
          value={paid ? "paid" : "pending"}
          onChange={(value) => setPaid(value === "paid")}
          options={[
            { value: "pending", label: "pendente", tone: "ink" },
            { value: "paid", label: `pago ${paidDate}`, tone: "graphite" },
          ]}
        />
        <label className={styles.apply}>
          <input
            type="checkbox"
            checked={applyToTemplate}
            onChange={(event) => setApplyToTemplate(event.target.checked)}
          />
          <span>usar como novo padrão a partir de {nextMonth}</span>
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
