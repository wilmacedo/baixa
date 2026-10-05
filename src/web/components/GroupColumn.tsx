import { Fragment } from "react";
import { type Bill, summarize } from "../../shared/ledger";
import { formatCents } from "../../shared/money";
import type { Today } from "../../shared/months";
import type { Group } from "../../shared/types";
import { GROUP_LABELS, plural, todayMarker } from "../format";
import { BillRow } from "./BillRow";
import styles from "./GroupColumn.module.css";
import { Odometer } from "./Odometer";

interface GroupColumnProps {
  group: Group;
  bills: Bill[];
  today: Today;
  isCurrentMonth: boolean;
  showPaid: boolean;
  settling: ReadonlySet<string>;
  editingId: string | null;
  focusedId: string | null;
  failedIds: readonly string[];
  tabbableId: string | null;
  compact?: boolean;
  dimmed?: boolean;
  onToggleShowPaid: (group: Group) => void;
  onHover: (group: Group, hovering: boolean) => void;
  onToggle: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onFocus: (templateId: string) => void;
}

const TodayMarker = ({ today }: { today: Today }) => (
  <li aria-hidden="true" className={styles.today}>
    <span className={styles.todayLabel}>{todayMarker(today)}</span>
    <span className={styles.todayLine} />
  </li>
);

export function GroupColumn({
  group,
  bills,
  today,
  isCurrentMonth,
  showPaid,
  settling,
  editingId,
  focusedId,
  failedIds,
  tabbableId,
  compact = false,
  dimmed = false,
  onToggleShowPaid,
  onHover,
  onToggle,
  onEdit,
  onFocus,
}: GroupColumnProps) {
  const label = GROUP_LABELS[group];
  const totals = summarize(bills);

  const isHidden = (bill: Bill) =>
    bill.status === "paid" &&
    !showPaid &&
    !settling.has(bill.templateId) &&
    editingId !== bill.templateId;

  const visible = bills.filter((bill) => !isHidden(bill));
  const firstAfterToday = visible.find((bill) => bill.dueDay > today.day);
  const markerBefore =
    isCurrentMonth && firstAfterToday && visible.indexOf(firstAfterToday) > 0
      ? firstAfterToday
      : undefined;
  const markerAtEnd =
    isCurrentMonth &&
    visible.length > 0 &&
    visible.every((bill) => bill.dueDay <= today.day);

  const summary =
    totals.pendingCount > 0
      ? `${totals.pendingCount} de ${bills.length} pendentes${
          totals.lateCount > 0
            ? ` · ${plural(totals.lateCount, "atrasada", "atrasadas")}`
            : ""
        }`
      : `${bills.length} de ${bills.length} pagas`;

  const weight = Math.round(780 - totals.progress * 480);
  const width = Math.round(106 - totals.progress * 20);
  const totalColor =
    totals.pendingCount === 0
      ? "var(--graphite)"
      : totals.lateCount > 0
        ? "var(--red)"
        : "var(--ink)";

  return (
    <section
      aria-label={label}
      className={styles.column}
      data-dim={dimmed}
      data-compact={compact}
      onMouseEnter={() => onHover(group, true)}
      onMouseLeave={() => onHover(group, false)}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>{label}</h2>
        <span
          className={styles.total}
          style={{
            color: totalColor,
            fontVariationSettings: `"wght" ${weight}, "wdth" ${width}`,
          }}
        >
          <Odometer cents={totals.pendingCents} delay={120} />
        </span>
        <span className={styles.summary} data-late={totals.lateCount > 0}>
          {summary}
        </span>
      </header>

      <ul className={styles.list}>
        {bills.map((bill) => (
          <Fragment key={bill.templateId}>
            {markerBefore === bill && <TodayMarker today={today} />}
            <BillRow
              bill={bill}
              compact={compact}
              sub={compact ? `dia ${bill.dueDay}` : undefined}
              hidden={isHidden(bill)}
              focused={focusedId === bill.templateId}
              editing={editingId === bill.templateId}
              failed={failedIds.includes(bill.templateId)}
              tabbable={tabbableId === bill.templateId}
              onToggle={onToggle}
              onEdit={onEdit}
              onFocus={onFocus}
            />
          </Fragment>
        ))}
        {markerAtEnd && <TodayMarker today={today} />}
      </ul>

      {totals.pendingCount === 0 && !showPaid && visible.length === 0 && (
        <p className={styles.done}>Tudo pago neste grupo.</p>
      )}

      {totals.paidCount > 0 && (
        <button
          type="button"
          className={styles.paid}
          aria-expanded={showPaid}
          onClick={() => onToggleShowPaid(group)}
        >
          <span className={styles.paidMark}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <polyline points="3.4,8.6 6.8,11.6 12.6,4.6" />
            </svg>
          </span>
          <span>{`${plural(totals.paidCount, "paga", "pagas")} · ${formatCents(totals.paidCents)}`}</span>
          <span className={styles.grow} />
          <span className={styles.action}>
            {showPaid ? "ocultar" : "mostrar"}
          </span>
        </button>
      )}
    </section>
  );
}
