import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { displayRaw } from "../../shared/amount-input";
import { parseRaw, toRaw } from "../../shared/money";
import {
  GROUPS,
  type Group,
  type Template,
  type TemplateInput,
} from "../../shared/types";
import { amountHandlers } from "../amount-handlers";
import { GROUP_LABELS } from "../format";
import { Switch } from "./Switch";
import styles from "./TemplateForm.module.css";

interface TemplateFormProps {
  title: string;
  initial: Template | null;
  group: Group;
  onSave: (input: TemplateInput) => void;
  onCancel: () => void;
}

export function TemplateForm({
  title,
  initial,
  group,
  onSave,
  onCancel,
}: TemplateFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [raw, setRaw] = useState(initial ? toRaw(initial.amountCents) : "");
  const [day, setDay] = useState(initial ? String(initial.dueDay) : "");
  const [chosenGroup, setChosenGroup] = useState<Group>(
    initial?.group ?? group,
  );
  const [autoPaid, setAutoPaid] = useState(initial?.autoPaid ?? false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => nameRef.current?.focus(), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const amountCents = parseRaw(raw);
    const dueDay = Number.parseInt(day, 10);
    if (!name.trim()) return setError("Dê um nome para a conta.");
    if (!(dueDay >= 1 && dueDay <= 31)) return setError("O dia vai de 1 a 31.");

    onSave({
      name: name.trim(),
      amountCents,
      dueDay,
      group: chosenGroup,
      autoPaid,
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} onKeyDown={handleKeyDown}>
      <span className={styles.title}>{title}</span>

      <label className={styles.field}>
        <span className={styles.label}>nome</span>
        <input
          ref={nameRef}
          className={styles.input}
          placeholder="ex.: Academia"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>valor padrão (opcional)</span>
          <input
            className={styles.input}
            data-amount="true"
            inputMode="decimal"
            placeholder="0,00"
            value={displayRaw(raw)}
            {...amountHandlers(raw, (next) => {
              setRaw(next);
              setError("");
            })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>dia</span>
          <input
            className={styles.input}
            inputMode="numeric"
            maxLength={2}
            value={day}
            onChange={(event) => {
              setDay(event.target.value.replace(/\D/g, "").slice(0, 2));
              setError("");
            }}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>grupo</span>
          <select
            className={styles.select}
            value={chosenGroup}
            onChange={(event) => setChosenGroup(event.target.value as Group)}
          >
            {GROUPS.map((option) => (
              <option key={option} value={option}>
                {GROUP_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.auto}>
        <Switch
          checked={autoPaid}
          label="Débito automático no cartão"
          onChange={setAutoPaid}
        />
        <span>débito automático no cartão · já vem paga todo mês</span>
      </div>

      {error && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}

      <div className={styles.footer}>
        <span className={styles.hint}>enter salva · esc cancela</span>
        <span className={styles.grow} />
        <button type="button" className={styles.cancel} onClick={onCancel}>
          cancelar
        </button>
        <button type="submit" className={styles.save}>
          salvar
        </button>
      </div>
    </form>
  );
}
