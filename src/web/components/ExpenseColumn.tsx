import { parseIsoDate } from "../../shared/dates";
import { formatCents } from "../../shared/money";
import type { MonthKey } from "../../shared/months";
import type { Expense } from "../../shared/types";
import { CATEGORY_LABELS, monthName, plural } from "../format";
import styles from "./ExpenseColumn.module.css";
import { Kbd } from "./Kbd";
import { Odometer } from "./Odometer";

interface ExpenseColumnProps {
  month: MonthKey;
  expenses: Expense[];
  loading: boolean;
  compact?: boolean;
  focusedId: string | null;
  flashId: string | null;
  tabbableId: string | null;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onFocus: (id: string) => void;
}

export function ExpenseColumn({
  month,
  expenses,
  loading,
  compact = false,
  focusedId,
  flashId,
  tabbableId,
  onNew,
  onEdit,
  onDelete,
  onFocus,
}: ExpenseColumnProps) {
  const totalCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <section
      aria-label="Gastos avulsos"
      className={styles.column}
      data-compact={compact}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>Avulsos</h2>
        <span className={styles.total}>
          <Odometer cents={totalCents} delay={60} />
        </span>
        <span className={styles.summary}>
          {expenses.length > 0
            ? `${plural(expenses.length, "gasto", "gastos")} · já saíram da conta`
            : "nenhum ainda"}
        </span>
      </header>

      {!compact && (
        <button type="button" className={styles.add} onClick={onNew}>
          <span className={styles.plus}>+</span>
          <span>novo gasto</span>
          <span className={styles.grow} />
          <Kbd>N</Kbd>
        </button>
      )}

      <ul className={styles.list}>
        {expenses.map((expense) => {
          const lit = focusedId === expense.id || flashId === expense.id;
          const category = CATEGORY_LABELS[expense.category];
          const amount = formatCents(expense.amountCents);
          const day = parseIsoDate(expense.spentOn).day;

          return (
            <li
              key={expense.id}
              data-av={expense.id}
              data-lit={lit}
              className={styles.row}
            >
              <span aria-hidden="true" className={styles.highlight} />
              <button
                type="button"
                data-role="main"
                tabIndex={lit || tabbableId === expense.id ? 0 : -1}
                aria-label={`${expense.description}, R$ ${amount}, ${category}, dia ${day}. Editar`}
                className={styles.main}
                onClick={() => onEdit(expense.id)}
                onFocus={() => onFocus(expense.id)}
              >
                <span aria-hidden="true" className={styles.initial}>
                  {category[0]}
                </span>
                <span className={styles.text}>
                  <span className={styles.description}>
                    {expense.description}
                  </span>
                  <span className={styles.meta}>
                    {category} · dia {day}
                  </span>
                </span>
                <span data-role="amount" className={styles.amount}>
                  {amount}
                </span>
              </button>
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Excluir ${expense.description}`}
                className={styles.remove}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onDelete(expense.id)}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      {!loading && expenses.length === 0 && (
        <p className={styles.empty}>
          Nenhum gasto avulso em {monthName(month)}.
        </p>
      )}
    </section>
  );
}
