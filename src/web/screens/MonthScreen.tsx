import { useEffect, useMemo, useRef, useState } from "react";
import type { CategorizedExpense } from "../../shared/category";
import {
  billsByGroup,
  buildBills,
  nextDue,
  paymentDate,
  summarize,
} from "../../shared/ledger";
import { formatCents } from "../../shared/money";
import type { Today } from "../../shared/months";
import {
  type Expense,
  type ExpenseInput,
  GROUPS,
  type Group,
} from "../../shared/types";
import { isBillHidden } from "../bill-visibility";
import { EditEntry } from "../components/EditEntry";
import { ExpenseColumn } from "../components/ExpenseColumn";
import { GroupColumn } from "../components/GroupColumn";
import { MonthNav } from "../components/MonthNav";
import { MonthSummary } from "../components/MonthSummary";
import { QuickAdd } from "../components/QuickAdd";
import { type FlightSource, flyValue } from "../fly-value";
import { moveColumn, moveFocus } from "../focus-nav";
import { CATEGORY_LABELS, monthName } from "../format";
import { heroSize } from "../layout";
import { newId } from "../new-id";
import { isEditable } from "../shortcuts";
import type { EntryEdit } from "../use-entry-edit";
import { useMonth } from "../use-month";
import type { useMonthNavigation } from "../use-month-navigation";
import { useSettling } from "../use-settling";
import styles from "./MonthScreen.module.css";

export interface QuickAddRequest {
  initialRaw?: string;
  editing?: Expense;
}

interface MonthScreenProps {
  navigation: ReturnType<typeof useMonthNavigation>;
  today: Today;
  width: number;
  announce: (text: string, undo?: () => unknown) => void;
  history: readonly CategorizedExpense[];
  onHistoryChanged: () => void;
  quickAdd: QuickAddRequest | null;
  onOpenQuickAdd: (request?: QuickAddRequest) => void;
  onCloseQuickAdd: () => void;
  keysEnabled: boolean;
}

const EXPENSE_PREFIX = "av:";
const FLASH_MS = 1300;

const toInput = ({ id: _id, ...input }: Expense): ExpenseInput => input;

export function MonthScreen({
  navigation,
  today,
  width,
  announce,
  history,
  onHistoryChanged,
  quickAdd,
  onOpenQuickAdd,
  onCloseQuickAdd,
  keysEnabled,
}: MonthScreenProps) {
  const { month } = navigation;
  const data = useMonth(month, today.month);
  const loading = data.status === "loading";
  const isCurrentMonth = month === today.month;

  const bills = useMemo(
    () => buildBills(month, today, data.templates, data.entries),
    [month, today, data.templates, data.entries],
  );
  const groups = useMemo(() => billsByGroup(bills), [bills]);
  const totals = useMemo(() => summarize(bills), [bills]);
  const lateBills = bills.filter((bill) => bill.status === "late");
  const expenseCents = data.expenses.reduce((sum, e) => sum + e.amountCents, 0);

  const settling = useSettling();
  const clearSettling = settling.clear;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the held rows must be dropped whenever another month is shown
  useEffect(() => {
    clearSettling();
    setEditingId(null);
  }, [month, clearSettling]);
  useEffect(() => {
    if (quickAdd) setEditingId(null);
  }, [quickAdd]);

  const [showPaid, setShowPaid] = useState<Record<Group, boolean>>({
    fixed: false,
    charges: false,
    cards: false,
  });
  const [focus, setFocus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const focusedExpense = focus?.startsWith(EXPENSE_PREFIX)
    ? focus.slice(EXPENSE_PREFIX.length)
    : null;
  const focusedBill = focus && !focusedExpense ? focus : null;
  const editingBill = bills.find((b) => b.templateId === editingId);
  const covered = quickAdd !== null || editingBill !== undefined;

  const toggleBill = (templateId: string) => {
    const bill = bills.find((b) => b.templateId === templateId);
    if (!bill) return;

    const paidAt = bill.paidAt ? null : paymentDate(month, bill.dueDay, today);
    const previous = {
      templateId,
      amountCents: bill.amountCents,
      paidAt: bill.paidAt,
    };

    if (paidAt) settling.hold(templateId, bill.group);
    else settling.drop(templateId);
    data.saveEntry({ ...previous, paidAt });

    announce(
      paidAt
        ? `${bill.name} paga · R$ ${formatCents(bill.amountCents)}`
        : `${bill.name} voltou para pendente`,
      () => {
        settling.clear();
        return data.saveEntry(previous);
      },
    );
  };

  const focusRow = (templateId: string) =>
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(
          `[data-bill="${templateId}"] [data-role="main"]`,
        )
        ?.focus(),
    );

  const editBill = (templateId: string) => {
    onCloseQuickAdd();
    setFocus(templateId);
    setEditingId(templateId);
  };

  const closeEdit = () => {
    if (editingId) focusRow(editingId);
    setEditingId(null);
  };

  const saveBillEdit = (edit: EntryEdit) => {
    if (!editingBill) return;

    const bill = editingBill;
    const previous = {
      templateId: bill.templateId,
      amountCents: bill.amountCents,
      paidAt: bill.paidAt,
    };
    const paidAt = edit.paid
      ? (bill.paidAt ?? paymentDate(month, bill.dueDay, today))
      : null;

    if (paidAt && !bill.paidAt) settling.hold(bill.templateId, bill.group);
    data.saveEntry({ ...previous, amountCents: edit.amountCents, paidAt });
    if (edit.applyToTemplate) {
      data.updateTemplate(bill.templateId, { amountCents: edit.amountCents });
    }
    closeEdit();

    announce(
      `${bill.name}: R$ ${formatCents(edit.amountCents)} em ${monthName(month)}${edit.applyToTemplate ? " e nos próximos" : ""}`,
      () => {
        settling.clear();
        data.saveEntry(previous);
        if (edit.applyToTemplate) {
          return data.updateTemplate(bill.templateId, {
            amountCents: bill.defaultCents,
          });
        }
      },
    );
  };

  const editExpense = (id: string) => {
    const expense = data.expenses.find((e) => e.id === id);
    if (expense) onOpenQuickAdd({ editing: expense });
  };

  const deleteExpense = (id: string) => {
    const expense = data.expenses.find((e) => e.id === id);
    if (!expense) return;

    data.deleteExpense(id);
    announce(`${expense.description} excluído`, () =>
      data.addExpense(toInput(expense), expense.id),
    );
    onHistoryChanged();
  };

  const flash = (id: string) => {
    setFlashId(id);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashId(null), FLASH_MS);
  };

  const flyToRow = (id: string, flight: FlightSource | null) => {
    if (!flight) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(
          `[data-av="${id}"] [data-role="amount"]`,
        );
        if (target) flyValue(flight, target);
      }),
    );
  };

  const saveExpense = async (
    input: ExpenseInput,
    flight: FlightSource | null,
    editingId: string | null,
  ) => {
    onCloseQuickAdd();
    const summary = `${input.description} · R$ ${formatCents(input.amountCents)} em ${CATEGORY_LABELS[input.category]}`;

    if (editingId) {
      const previous = data.expenses.find((e) => e.id === editingId);
      await data.replaceExpense(editingId, input);
      flash(editingId);
      announce(
        summary,
        previous && (() => data.replaceExpense(previous.id, toInput(previous))),
      );
      onHistoryChanged();
      return;
    }

    const id = newId();
    const created = await data.addExpense(input, id);
    if (!created) return;

    const targetMonth = input.spentOn.slice(0, 7);
    if (targetMonth === month) flyToRow(id, flight);
    else navigation.goTo(targetMonth);
    flash(id);
    announce(summary, () => data.deleteExpense(id));
    onHistoryChanged();
  };

  const navColumns = useMemo(
    () => [
      ...GROUPS.map((group) =>
        groups[group]
          .filter(
            (bill) =>
              !isBillHidden(bill, {
                showPaid: showPaid[group],
                settling: settling.settling,
                editingId,
              }),
          )
          .map((bill) => bill.templateId),
      ),
      data.expenses.map((e) => `${EXPENSE_PREFIX}${e.id}`),
    ],
    [groups, showPaid, settling.settling, editingId, data.expenses],
  );
  const firstId = navColumns.flat()[0] ?? null;
  const tabbable = focus ? null : firstId;
  const tabbableExpense = tabbable?.startsWith(EXPENSE_PREFIX)
    ? tabbable.slice(EXPENSE_PREFIX.length)
    : null;
  const tabbableBill = tabbable && !tabbableExpense ? tabbable : null;

  const focusId = (id: string | null) => {
    setFocus(id);
    if (!id) return;
    requestAnimationFrame(() => {
      const selector = id.startsWith(EXPENSE_PREFIX)
        ? `[data-av="${id.slice(EXPENSE_PREFIX.length)}"] [data-role="main"]`
        : `[data-bill="${id}"] [data-role="main"]`;
      const element = document.querySelector<HTMLElement>(selector);
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({ block: "nearest" });
    });
  };

  const toggleAllPaid = () => {
    settling.clear();
    setShowPaid((current) => {
      const next = !Object.values(current).some(Boolean);
      return { fixed: next, charges: next, cards: next };
    });
  };

  const keysActive = keysEnabled && !covered;
  useEffect(() => {
    if (!keysActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditable(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const act = (action: () => void) => {
        event.preventDefault();
        action();
      };

      if (key === "[" || key === "PageUp")
        return act(() => navigation.goBy(-1));
      if (key === "]" || key === "PageDown")
        return act(() => navigation.goBy(1));
      if (key === "h") return act(navigation.goToCurrent);
      if (key === "p") return act(toggleAllPaid);
      if (key === "ArrowDown" || key === "j")
        return act(() => focusId(moveFocus(navColumns, focus, 1)));
      if (key === "ArrowUp" || key === "k")
        return act(() => focusId(moveFocus(navColumns, focus, -1)));
      if (key === "ArrowRight" || key === "l")
        return act(() => focusId(moveColumn(navColumns, focus, 1)));
      if (key === "ArrowLeft")
        return act(() => focusId(moveColumn(navColumns, focus, -1)));
      if (!focus) return;

      if (key === "Escape") {
        return act(() => {
          setFocus(null);
          (document.activeElement as HTMLElement | null)?.blur();
        });
      }

      if (focus.startsWith(EXPENSE_PREFIX)) {
        const id = focus.slice(EXPENSE_PREFIX.length);
        if (key === "Delete" || key === "Backspace") {
          return act(() => deleteExpense(id));
        }
        if (key === "e") return act(() => editExpense(id));
        return;
      }

      if (key === " ") return act(() => toggleBill(focus));
      if (key === "e") return act(() => editBill(focus));
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key === " " &&
        target instanceof HTMLElement &&
        target.dataset.role === "main"
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  const columns =
    width >= 1200
      ? "minmax(0, 1.3fr) repeat(3, minmax(0, 1fr))"
      : "repeat(auto-fit, minmax(260px, 1fr))";

  return (
    <div className={styles.screen}>
      <div className={styles.panels}>
        <div
          className={styles.panel}
          data-active={!covered}
          inert={covered}
          aria-hidden={covered}
        >
          <MonthSummary
            nav={
              <MonthNav
                month={month}
                currentMonth={today.month}
                canGoBack={navigation.canGoBack}
                slide={navigation.style}
                onPrevious={() => navigation.goBy(-1)}
                onNext={() => navigation.goBy(1)}
                onCurrent={navigation.goToCurrent}
              />
            }
            month={month}
            totals={totals}
            expenseCount={data.expenses.length}
            expenseCents={expenseCents}
            lateBills={lateBills}
            next={nextDue(bills)}
            loading={loading}
            width={width}
            onShowLate={() => focusId(lateBills[0]?.templateId ?? null)}
          />
        </div>
        {editingBill && (
          <div className={styles.panel} data-active={true}>
            <EditEntry
              key={editingBill.templateId}
              bill={editingBill}
              month={month}
              today={today}
              size={heroSize(width)}
              onSave={saveBillEdit}
              onCancel={closeEdit}
            />
          </div>
        )}
        {quickAdd && (
          <div className={styles.panel} data-active={true}>
            <QuickAdd
              key={quickAdd.editing?.id ?? "new"}
              today={today}
              size={heroSize(width)}
              history={history}
              initialRaw={quickAdd.initialRaw}
              editing={quickAdd.editing}
              onSave={saveExpense}
              onCancel={onCloseQuickAdd}
            />
          </div>
        )}
      </div>

      <div
        className={styles.ledger}
        style={{ ...navigation.style, gridTemplateColumns: columns }}
      >
        {GROUPS.map((group) => (
          <GroupColumn
            key={group}
            group={group}
            bills={groups[group]}
            today={today}
            isCurrentMonth={isCurrentMonth}
            showPaid={showPaid[group]}
            settling={settling.settling}
            editingId={editingId}
            focusedId={focusedBill}
            failedIds={data.failedEntries}
            tabbableId={tabbableBill}
            dimmed={covered}
            onToggleShowPaid={(g) => {
              settling.clear();
              setShowPaid((current) => ({ ...current, [g]: !current[g] }));
            }}
            onHover={settling.onHover}
            onToggle={toggleBill}
            onEdit={editBill}
            onFocus={setFocus}
          />
        ))}
        <ExpenseColumn
          month={month}
          expenses={data.expenses}
          loading={loading}
          focusedId={focusedExpense}
          flashId={flashId}
          tabbableId={tabbableExpense}
          onNew={() => onOpenQuickAdd()}
          onEdit={editExpense}
          onDelete={deleteExpense}
          onFocus={(id) => setFocus(`${EXPENSE_PREFIX}${id}`)}
        />
      </div>
    </div>
  );
}
