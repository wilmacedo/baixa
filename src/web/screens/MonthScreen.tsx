import { useMemo, useState } from "react";
import {
  billsByGroup,
  buildBills,
  nextDue,
  paymentDate,
  summarize,
} from "../../shared/ledger";
import type { Today } from "../../shared/months";
import { GROUPS, type Group } from "../../shared/types";
import { ExpenseColumn } from "../components/ExpenseColumn";
import { GroupColumn } from "../components/GroupColumn";
import { MonthNav } from "../components/MonthNav";
import { MonthSummary } from "../components/MonthSummary";
import { useMonth } from "../use-month";
import type { useMonthNavigation } from "../use-month-navigation";
import styles from "./MonthScreen.module.css";

interface MonthScreenProps {
  navigation: ReturnType<typeof useMonthNavigation>;
  today: Today;
  width: number;
}

const EXPENSE_PREFIX = "av:";
const noop = () => {};

export function MonthScreen({ navigation, today, width }: MonthScreenProps) {
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

  const [showPaid, setShowPaid] = useState<Record<Group, boolean>>({
    fixed: false,
    charges: false,
    cards: false,
  });
  const [focus, setFocus] = useState<string | null>(null);
  const focusedExpense = focus?.startsWith(EXPENSE_PREFIX)
    ? focus.slice(EXPENSE_PREFIX.length)
    : null;
  const focusedBill = focus && !focusedExpense ? focus : null;

  const toggleBill = (templateId: string) => {
    const bill = bills.find((b) => b.templateId === templateId);
    if (!bill) return;
    data.saveEntry({
      templateId,
      amountCents: bill.amountCents,
      paidAt: bill.paidAt ? null : paymentDate(month, bill.dueDay, today),
    });
  };

  const columns =
    width >= 1200
      ? "minmax(0, 1.3fr) repeat(3, minmax(0, 1fr))"
      : "repeat(auto-fit, minmax(260px, 1fr))";

  return (
    <div className={styles.screen}>
      <div className={styles.panels}>
        <div className={styles.panel} data-active={true}>
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
            onShowLate={() => setFocus(lateBills[0]?.templateId ?? null)}
          />
        </div>
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
            settling={new Set()}
            editingId={null}
            focusedId={focusedBill}
            failedIds={data.failedEntries}
            tabbableId={null}
            onToggleShowPaid={(g) =>
              setShowPaid((current) => ({ ...current, [g]: !current[g] }))
            }
            onHover={noop}
            onToggle={toggleBill}
            onEdit={noop}
            onFocus={setFocus}
          />
        ))}
        <ExpenseColumn
          month={month}
          expenses={data.expenses}
          loading={loading}
          focusedId={focusedExpense}
          flashId={null}
          tabbableId={null}
          onNew={noop}
          onEdit={noop}
          onDelete={(id) => data.deleteExpense(id)}
          onFocus={(id) => setFocus(`${EXPENSE_PREFIX}${id}`)}
        />
      </div>
    </div>
  );
}
