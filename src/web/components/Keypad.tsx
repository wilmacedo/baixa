import styles from "./Keypad.module.css";

const KEYS: Array<{ label: string; text: string; key: string }> = [
  ..."123456789".split("").map((d) => ({ label: d, text: d, key: d })),
  { label: "vírgula", text: ",", key: "," },
  { label: "0", text: "0", key: "0" },
  { label: "apagar", text: "⌫", key: "Backspace" },
];

interface KeypadProps {
  onKey: (key: string) => void;
  size?: "regular" | "small";
}

export function Keypad({ onKey, size = "regular" }: KeypadProps) {
  return (
    <div className={styles.keypad} data-size={size}>
      {KEYS.map((key) => (
        <button
          key={key.key}
          type="button"
          className={styles.key}
          aria-label={key.label}
          onClick={() => onKey(key.key)}
        >
          {key.text}
        </button>
      ))}
    </div>
  );
}
