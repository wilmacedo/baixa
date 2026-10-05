import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { type CategorizedExpense, detectCategory } from "../../shared/category";
import { addDays, daysBetween } from "../../shared/dates";
import { formatCents, parseRaw, toRaw } from "../../shared/money";
import type { Today } from "../../shared/months";
import { suggestCompletion } from "../../shared/suggest";
import {
  CATEGORIES,
  type Category,
  type Expense,
  type ExpenseInput,
} from "../../shared/types";
import { captureFlight, type FlightSource } from "../fly-value";
import { CATEGORY_HOTKEYS, CATEGORY_LABELS, dateLabel } from "../format";
import { useShake } from "../use-shake";
import { AmountField } from "./AmountField";
import { CategoryChips } from "./CategoryChips";
import { DateStepper } from "./DateStepper";
import styles from "./QuickAdd.module.css";

const MAX_DAYS_BACK = 60;

type Field = "amount" | "description" | "category" | "date";
type Problem = "amount" | "category" | null;

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

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export function QuickAdd({
  today,
  size,
  history,
  initialRaw = "",
  editing,
  onSave,
  onCancel,
}: QuickAddProps) {
  const todayIso = `${today.month}-${String(today.day).padStart(2, "0")}`;
  const [raw, setRaw] = useState(
    editing ? toRaw(editing.amountCents) : initialRaw,
  );
  const [description, setDescription] = useState(editing?.description ?? "");
  const [category, setCategory] = useState<Category | null>(
    editing?.category ?? null,
  );
  const [date, setDate] = useState(editing?.spentOn ?? todayIso);
  const [problem, setProblem] = useState<Problem>(null);
  const [field, setField] = useState<Field>("amount");

  const amountRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLFieldSetElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const shake = useShake();

  useEffect(() => amountRef.current?.focus(), []);

  const detected = category ? null : detectCategory(description, history);
  const shown = category ?? detected;
  const completion =
    field === "description" ? suggestCompletion(description, history) : "";
  const earliest = addDays(todayIso, -MAX_DAYS_BACK);

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
    const amountCents = parseRaw(raw);
    if (amountCents <= 0) {
      setProblem("amount");
      shake.shake();
      focusField("amount");
      return;
    }

    const resolved = category ?? detectCategory(typed, history);
    if (!resolved) {
      setProblem("category");
      focusField("category");
      return;
    }

    const flight =
      !editing && numberRef.current
        ? captureFlight(numberRef.current, formatCents(amountCents))
        : null;
    onSave(
      {
        description: capitalize(typed.trim() || CATEGORY_LABELS[resolved]),
        amountCents,
        category: resolved,
        spentOn: date,
      },
      flight,
      editing?.id ?? null,
    );
  };

  const moveDate = (days: number) => {
    const next = addDays(date, days);
    if (next >= earliest && next <= todayIso) setDate(next);
  };

  const cycleCategory = (step: number) => {
    const current = shown ? CATEGORIES.indexOf(shown) : -1;
    const next =
      current < 0
        ? 0
        : (current + step + CATEGORIES.length) % CATEGORIES.length;
    setCategory(CATEGORIES[next] ?? null);
    setProblem(null);
  };

  const handleEnter = () => {
    if (field === "amount") {
      if (parseRaw(raw) > 0) focusField("description");
      else {
        setProblem("amount");
        shake.shake();
      }
      return;
    }

    if (field === "description") {
      const completed = description + completion;
      if (completion) setDescription(completed);
      if (category ?? detectCategory(completed, history)) {
        save(completed);
      } else {
        setProblem("category");
        focusField("category");
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
      setDescription(description + completion);
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
        setCategory(picked);
        setProblem(null);
      } else if (key === "ArrowRight" || key === "ArrowLeft") {
        event.preventDefault();
        cycleCategory(key === "ArrowRight" ? 1 : -1);
      }
      return;
    }

    if (field === "date") {
      if (key === "ArrowLeft" || key === "ArrowDown") {
        event.preventDefault();
        moveDate(-1);
      } else if (key === "ArrowRight" || key === "ArrowUp") {
        event.preventDefault();
        moveDate(1);
      } else if (key.toLowerCase() === "h") {
        event.preventDefault();
        setDate(todayIso);
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
          raw={raw}
          onChange={(next) => {
            setRaw(next);
            setProblem(null);
          }}
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
              onChange={(event) => {
                setDescription(event.target.value);
                setProblem(null);
              }}
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
            selected={category}
            suggested={detected}
            focused={field === "category"}
            onPick={(picked) => {
              setCategory(picked);
              setProblem(null);
            }}
            onFocus={() => setField("category")}
          />
        </div>

        <div className={styles.block}>
          <span className={styles.label}>data</span>
          <DateStepper
            stepperRef={dateRef}
            label={dateLabel(date, todayIso)}
            canGoForward={daysBetween(date, todayIso) > 0}
            focused={field === "date"}
            onPrevious={() => moveDate(-1)}
            onNext={() => moveDate(1)}
            onFocus={() => setField("date")}
          />
        </div>
      </div>
    </section>
  );
}
