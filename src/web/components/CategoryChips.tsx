import type { Ref } from "react";
import { CATEGORIES, type Category } from "../../shared/types";
import { CATEGORY_LABELS } from "../format";
import styles from "./CategoryChips.module.css";

interface CategoryChipsProps {
  selected: Category | null;
  suggested: Category | null;
  onPick: (category: Category) => void;
  compact?: boolean;
  focused?: boolean;
  groupRef?: Ref<HTMLFieldSetElement>;
  onFocus?: () => void;
}

export function CategoryChips({
  selected,
  suggested,
  onPick,
  compact = false,
  focused = false,
  groupRef,
  onFocus,
}: CategoryChipsProps) {
  return (
    <fieldset
      ref={groupRef}
      tabIndex={compact ? undefined : 0}
      data-field="category"
      data-focused={focused}
      data-compact={compact}
      className={styles.group}
      onFocus={onFocus}
    >
      <legend className={styles.legend}>Categoria</legend>
      {CATEGORIES.map((category) => {
        const label = CATEGORY_LABELS[category];
        const state =
          selected === category
            ? "selected"
            : !selected && suggested === category
              ? "suggested"
              : "idle";

        return (
          <button
            key={category}
            type="button"
            aria-pressed={state === "selected"}
            tabIndex={-1}
            data-state={state}
            className={styles.chip}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(category)}
          >
            {compact ? (
              label
            ) : (
              <>
                <span className={styles.initial}>{label[0]}</span>
                {label.slice(1)}
              </>
            )}
          </button>
        );
      })}
    </fieldset>
  );
}
