import styles from "./Switch.module.css";

interface SwitchProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

export function Switch({ checked, label, onChange }: SwitchProps) {
  return (
    <span className={styles.switch}>
      <input
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={checked}
        aria-checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true" className={styles.track}>
        <span className={styles.knob} />
      </span>
    </span>
  );
}
