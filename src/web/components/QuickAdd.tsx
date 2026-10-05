import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { CategorizedExpense } from "../../shared/category";
import { formatCents } from "../../shared/money";
import type { Today } from "../../shared/months";
import { suggestCompletion } from "../../shared/suggest";
import {
  CATEGORIES,
  type Expense,
  type ExpenseInput,
} from "../../shared/types";
import { captureFlight, type FlightSource } from "../fly-value";
import { CATEGORY_HOTKEYS, dateLabel } from "../format";
import { useExpenseForm } from "../use-expense-form";
import { useShake } from "../use-shake";
import { AmountField } from "./AmountField";
import { CategoryChips } from "./CategoryChips";
import { DateStepper } from "./DateStepper";
import styles from "./QuickAdd.module.css";

type Field = "amount" | "description" | "category" | "date";

interface QuickAddProps {
  today: Today;
  size: number;
  history: readonly CategorizedExpense[];
  initialRaw?: string;
  editing?: Expense;
  onSave: (
    input: ExpenseInput,
    flight: FlightSource | null,
    editingId: string | null,
  ) => void;
  onCancel: () => void;
}

export function QuickAdd({
  today,
  size,
  history,
  initialRaw,
  editing,
  onSave,
  onCancel,
}: QuickAddProps) {
  const form = useExpenseForm({ today, history, initialRaw, editing });
  const [field, setField] = useState<Field>("amount");

  const amountRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLFieldSetElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const shake = useShake();

  useEffect(() => amountRef.current?.focus(), []);

  const { problem, detected, description } = form;
  const completion =
    field === "description" ? suggestCompletion(description, history) : "";

  const hint =
    problem === "amount"
      ? "Digite um valor maior que zero."
      : problem === "category"
        ? "Escolha a categoria: C, M, S, T, L ou O."
        : editing
          ? "Editando um gasto já lançado."
          : detected
            ? "Categoria sugerida pela descrição. Tab para trocar."
            : "enter avança · ⌘enter salva · esc fecha";

  const focusField = (next: Field) => {
    const target = {
      amount: amountRef,
      description: descriptionRef,
      category: categoryRef,
      date: dateRef,
    }[next];
    target.current?.focus();
  };

  const save = (typed: string = description) => {
    const result = form.validate(typed);
    if ("problem" in result) {
      form.setProblem(result.problem);
      if (result.problem === "amount") shake.shake();
      focusField(result.problem);
      return;
    }

    const flight =
      !editing && numberRef.current
        ? captureFlight(
            numberRef.current,
            formatCents(result.input.amountCents),
          )
        : null;
    onSave(result.input, flight, editing?.id ?? null);
  };

  const handleEnter = () => {
    if (field === "amount") {
      if (form.amountCents > 0) {
        focusField("description");
      } else {
        form.setProblem("amount");
        shake.shake();
      }
      return;
    }

    if (field === "description") {
      const completed = description + completion;
      if (completion) form.changeDescription(completed);
      const result = form.validate(completed);
      if ("problem" in result && result.problem === "category") {
        form.setProblem("category");
        focusField("category");
      } else {
        save(completed);
      }
      return;
    }

    save();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    const { key } = event;

    if (key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (key === "Enter") {
      event.preventDefault();
      if (event.metaKey || event.ctrlKey) save();
      else handleEnter();
      return;
    }

    if (
      field === "description" &&
      completion &&
      (key === "ArrowRight" || key === "Tab") &&
      !event.shiftKey &&
      descriptionRef.current?.selectionStart === description.length
    ) {
      if (key === "ArrowRight") event.preventDefault();
      form.changeDescription(description + completion);
      return;
    }

    if (field === "category") {
      const hotkey = CATEGORIES.find(
        (c) => CATEGORY_HOTKEYS[c] === key.toLowerCase(),
      );
      const numbered = /^[1-6]$/.test(key)
        ? CATEGORIES[Number(key) - 1]
        : undefined;
      const picked = hotkey ?? numbered;
      if (picked) {
        event.preventDefault();
        form.pickCategory(picked);
      } else if (key === "ArrowRight" || key === "ArrowLeft") {
        event.preventDefault();
        form.cycleCategory(key === "ArrowRight" ? 1 : -1);
      }
      return;
    }

    if (field === "date") {
      if (key === "ArrowLeft" || key === "ArrowDown") {
        event.preventDefault();
        form.moveDate(-1);
      } else if (key === "ArrowRight" || key === "ArrowUp") {
        event.preventDefault();
        form.moveDate(1);
      } else if (key.toLowerCase() === "h") {
        event.preventDefault();
        form.setDate(form.todayIso);
      }
    }
  };

  const title = editing ? "editar gasto" : "novo gasto";

  return (
    <section
      aria-label={title}
      className={styles.panel}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.bar}>
        <span className={styles.title}>{title}</span>
        <span className={styles.rule} />
        <span className={styles.hint} data-problem={problem !== null}>
          {hint}
        </span>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          cancelar
        </button>
        <button type="button" className={styles.save} onClick={() => save()}>
          {editing ? "salvar" : "lançar gasto"}
        </button>
      </div>

      <div className={styles.amount}>
        <AmountField
          raw={form.raw}
          onChange={form.changeRaw}
          size={size}
          label="Valor do gasto"
          field="amount"
          inputRef={amountRef}
          numberRef={numberRef}
          shake={shake.transform}
          onFocus={() => setField("amount")}
        />
      </div>

      <div className={styles.fields}>
        <label className={`${styles.block} ${styles.description}`}>
          <span className={styles.label}>descrição</span>
          <span className={styles.line} data-focused={field === "description"}>
            <span aria-hidden="true" className={styles.completion}>
              <span className={styles.typed}>{description}</span>
              <span className={styles.suggestion}>{completion}</span>
            </span>
            <input
              ref={descriptionRef}
              data-field="description"
              aria-label="Descrição"
              autoComplete="off"
              placeholder="ex.: farmácia"
              value={description}
              onChange={(event) => form.changeDescription(event.target.value)}
              onFocus={() => setField("description")}
            />
          </span>
        </label>

        <div className={styles.block}>
          <span className={styles.label} data-problem={problem === "category"}>
            {problem === "category"
              ? "escolha a categoria"
              : detected
                ? "categoria · sugerida"
                : "categoria"}
          </span>
          <CategoryChips
            groupRef={categoryRef}
            selected={form.category}
            suggested={detected}
            focused={field === "category"}
            onPick={form.pickCategory}
            onFocus={() => setField("category")}
          />
        </div>

        <div className={styles.block}>
          <span className={styles.label}>data</span>
          <DateStepper
            stepperRef={dateRef}
            label={dateLabel(form.date, form.todayIso)}
            canGoForward={form.canGoForward}
            focused={field === "date"}
            onPrevious={() => form.moveDate(-1)}
            onNext={() => form.moveDate(1)}
            onFocus={() => setField("date")}
          />
        </div>
      </div>
    </section>
  );
}
