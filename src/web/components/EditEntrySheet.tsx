import { useEffect, useRef } from "react";
import { typeKey } from "../../shared/amount-input";
import type { Bill } from "../../shared/ledger";
import { formatCents } from "../../shared/money";
import type { MonthKey, Today } from "../../shared/months";
import { GROUP_LABELS, monthName } from "../format";
import { type EntryEdit, useEntryEdit } from "../use-entry-edit";
import { useShake } from "../use-shake";
import { AmountDisplay } from "./AmountDisplay";
import styles from "./EditEntrySheet.module.css";
import { Keypad } from "./Keypad";
import { SegmentedControl } from "./SegmentedControl";

interface EditEntrySheetProps {
  bill: Bill;
  month: MonthKey;
  today: Today;
  width: number;
  onSave: (edit: EntryEdit) => void;
  onCancel: () => void;
}

export function EditEntrySheet({
  bill,
  month,
  today,
  width,
  onSave,
  onCancel,
}: EditEntrySheetProps) {
  const edit = useEntryEdit({ bill, month, today });
  const shake = useShake();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => dialog.current?.showModal(), []);

  const save = () => {
    const result = edit.result();
    if (!result) {
      shake.shake();
      return;
    }
    onSave(result);
  };

  return (
    <dialog
      ref={dialog}
      aria-label="Editar lançamento"
      className={styles.sheet}
      onClose={onCancel}
    >
      <span aria-hidden="true" className={styles.grab} />
      <div className={styles.head}>
        <div className={styles.titles}>
          <span className={styles.tag}>
            {GROUP_LABELS[bill.group].toLowerCase()} · vence dia {bill.dueDay}
          </span>
          <span className={styles.name}>
            {bill.name}
            <span className={styles.scope}>só em {monthName(month)}</span>
          </span>
        </div>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          cancelar
        </button>
      </div>

      <div className={styles.amount}>
        <AmountDisplay raw={edit.raw} width={width} shake={shake.transform} />
      </div>

      <div className={styles.default}>
        <span>
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
        <span className={styles.grow} />
        <button
          type="button"
          className={styles.reset}
          disabled={edit.delta === 0}
          onClick={edit.reset}
        >
          voltar ao padrão
        </button>
      </div>

      <div className={styles.options}>
        <SegmentedControl
          fill
          size="large"
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
      </div>

      <Keypad
        size="small"
        onKey={(key) => edit.setRaw(typeKey(edit.raw, key))}
      />
      <div className={styles.footer}>
        <button type="button" className={styles.save} onClick={save}>
          salvar
        </button>
      </div>
    </dialog>
  );
}
