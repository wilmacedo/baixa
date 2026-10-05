import styles from "./SegmentedControl.module.css";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  tone?: "ink" | "graphite";
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  fill?: boolean;
  size?: "regular" | "large";
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  fill = false,
  size = "regular",
}: SegmentedControlProps<T>) {
  return (
    <fieldset className={styles.group} data-fill={fill} data-size={size}>
      <legend className={styles.legend}>{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          data-tone={option.tone}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
