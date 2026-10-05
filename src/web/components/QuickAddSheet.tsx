import { useEffect, useRef } from "react";
import { typeKey } from "../../shared/amount-input";
import type { CategorizedExpense } from "../../shared/category";
import { formatCents } from "../../shared/money";
import type { Today } from "../../shared/months";
import type { Expense, ExpenseInput } from "../../shared/types";
import { dateLabel } from "../format";
import { useExpenseForm } from "../use-expense-form";
import { useShake } from "../use-shake";
import { AmountDisplay } from "./AmountDisplay";
import { CategoryChips } from "./CategoryChips";
import { DateStepper } from "./DateStepper";
import { Keypad } from "./Keypad";
import styles from "./QuickAddSheet.module.css";

interface QuickAddSheetProps {
  today: Today;
  width: number;
  history: readonly CategorizedExpense[];
  initialRaw?: string;
  editing?: Expense;
  onSave: (input: ExpenseInput, editingId: string | null) => void;
  onCancel: () => void;
}

export function QuickAddSheet({
  today,
  width,
  history,
  initialRaw,
  editing,
  onSave,
  onCancel,
}: QuickAddSheetProps) {
  const form = useExpenseForm({ today, history, initialRaw, editing });
  const shake = useShake();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => dialog.current?.showModal(), []);

  const save = () => {
    const result = form.validate();
    if ("problem" in result) {
      form.setProblem(result.problem);
      if (result.problem === "amount") shake.shake();
      return;
    }
    onSave(result.input, editing?.id ?? null);
  };

  const title = editing ? "editar gasto" : "novo gasto";
  const problem =
    form.problem === "amount"
      ? "Digite um valor maior que zero."
      : form.problem === "category"
        ? "Escolha a categoria."
        : "";

  return (
    <dialog
      ref={dialog}
      aria-label={title}
      className={styles.sheet}
      onClose={onCancel}
    >
      <div className={styles.bar}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          cancelar
        </button>
        <span className={styles.title}>{title}</span>
        <span className={styles.balance} />
      </div>

      <div className={styles.amount}>
        <AmountDisplay raw={form.raw} width={width} shake={shake.transform} />
      </div>

      <div className={styles.fields}>
        <input
          aria-label="Descrição"
          className={styles.description}
          placeholder="descrição (opcional)"
          autoComplete="off"
          value={form.description}
          onChange={(event) => form.changeDescription(event.target.value)}
        />
        <CategoryChips
          compact
          selected={form.category}
          suggested={form.detected}
          onPick={form.pickCategory}
        />
        <DateStepper
          compact
          label={dateLabel(form.date, form.todayIso)}
          canGoForward={form.canGoForward}
          onPrevious={() => form.moveDate(-1)}
          onNext={() => form.moveDate(1)}
        />
      </div>

      <p role="alert" className={styles.problem}>
        {problem}
      </p>
      <div className={styles.grow} />

      <Keypad onKey={(key) => form.changeRaw(typeKey(form.raw, key))} />
      <div className={styles.footer}>
        <button type="button" className={styles.save} onClick={save}>
          {form.amountCents > 0
            ? `${editing ? "salvar" : "lançar"} R$ ${formatCents(form.amountCents)}`
            : "digite o valor"}
        </button>
      </div>
    </dialog>
  );
}
