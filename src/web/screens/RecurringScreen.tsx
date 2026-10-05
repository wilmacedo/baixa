import { useState } from "react";
import { formatCents } from "../../shared/money";
import type { Today } from "../../shared/months";
import {
  GROUPS,
  type Group,
  type Template,
  type TemplateInput,
} from "../../shared/types";
import { ErrorBanner } from "../components/ErrorBanner";
import { Odometer } from "../components/Odometer";
import { Switch } from "../components/Switch";
import { TemplateForm } from "../components/TemplateForm";
import { GROUP_LABELS, monthName, plural } from "../format";
import { heroSize } from "../layout";
import { useTemplates } from "../use-templates";
import styles from "./RecurringScreen.module.css";

interface RecurringScreenProps {
  today: Today;
  width: number;
  announce: (text: string, undo?: () => unknown) => void;
}

type Editing = { id: string } | { group: Group } | null;

export function RecurringScreen({
  today,
  width,
  announce,
}: RecurringScreenProps) {
  const store = useTemplates();
  const [editing, setEditing] = useState<Editing>(null);
  const month = monthName(today.month);
  const size = heroSize(width);

  const active = store.templates.filter((t) => t.active);
  const totalCents = active.reduce((sum, t) => sum + t.amountCents, 0);

  const byDay = (a: Template, b: Template) =>
    a.dueDay - b.dueDay || a.name.localeCompare(b.name);

  const save = async (input: TemplateInput) => {
    const target = editing;
    setEditing(null);

    if (target && "id" in target) {
      const previous = store.templates.find((t) => t.id === target.id);
      if (!(await store.update(target.id, input))) {
        announce("Não foi possível salvar a conta. Tente de novo.");
        return;
      }
      announce(
        `${input.name} salva · vale a partir de ${month}`,
        previous &&
          (() =>
            store.update(previous.id, {
              name: previous.name,
              amountCents: previous.amountCents,
              dueDay: previous.dueDay,
              group: previous.group,
              autoPaid: previous.autoPaid,
            })),
      );
      return;
    }

    const created = await store.create(input);
    announce(
      created
        ? `${input.name} criada · vale a partir de ${month}`
        : "Não foi possível criar a conta. Tente de novo.",
    );
  };

  const toggle = (template: Template) => {
    const next = !template.active;
    store.update(template.id, { active: next }).then((updated) => {
      if (!updated)
        announce("Não foi possível alterar a conta. Tente de novo.");
    });
    announce(
      next
        ? `${template.name} ativada de novo`
        : `${template.name} desativada · sai a partir de ${month}`,
      () => store.update(template.id, { active: template.active }),
    );
  };

  return (
    <div className={styles.screen}>
      {store.status === "error" && (
        <ErrorBanner
          label="sem conexão"
          message="Não foi possível carregar as contas recorrentes. Nada se perdeu."
          action="tentar de novo"
          onAction={store.reload}
        />
      )}
      <section aria-label="Contas recorrentes" className={styles.hero}>
        <div className={styles.heading}>
          <h1 className={styles.title}>contas recorrentes</h1>
          <span className={styles.caption}>
            soma das contas ativas, por mês
          </span>
          <div className={styles.figure}>
            <span
              aria-hidden="true"
              className={styles.currency}
              style={{ fontSize: Math.max(18, size * 0.19) }}
            >
              R$
            </span>
            <span className={styles.number} style={{ fontSize: size * 0.82 }}>
              <Odometer cents={totalCents} />
            </span>
          </div>
        </div>
        <div className={styles.side}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>ativas</span>
            <span />
            <span className={styles.statValue}>{active.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>desativadas</span>
            <span />
            <span className={styles.statValue} data-muted="true">
              {store.templates.length - active.length}
            </span>
          </div>
          <p className={styles.note}>
            Mudanças aqui valem para os meses ainda não alterados, a partir de{" "}
            {month}. Para mudar só um mês, edite a conta na tela do mês.
          </p>
        </div>
      </section>

      <div className={styles.groups}>
        {GROUPS.map((group) => {
          const templates = store.templates
            .filter((t) => t.group === group)
            .sort(byDay);
          const groupActive = templates.filter((t) => t.active);
          const inactive = templates.length - groupActive.length;
          const creating =
            editing !== null && "group" in editing && editing.group === group;

          return (
            <section key={group} aria-label={GROUP_LABELS[group]}>
              <header className={styles.head}>
                <h2 className={styles.groupTitle}>{GROUP_LABELS[group]}</h2>
                <span className={styles.groupTotal}>
                  {formatCents(
                    groupActive.reduce((sum, t) => sum + t.amountCents, 0),
                  )}
                </span>
                <span className={styles.summary}>
                  {plural(groupActive.length, "ativa", "ativas")}
                  {inactive > 0 &&
                    ` · ${plural(inactive, "desativada", "desativadas")}`}
                </span>
              </header>

              <ul className={styles.list}>
                {templates.map((template) =>
                  editing && "id" in editing && editing.id === template.id ? (
                    <li key={template.id}>
                      <TemplateForm
                        title="editar conta recorrente"
                        initial={template}
                        group={group}
                        onSave={save}
                        onCancel={() => setEditing(null)}
                      />
                    </li>
                  ) : (
                    <li
                      key={template.id}
                      className={styles.row}
                      data-active={template.active}
                    >
                      <span className={styles.day}>
                        {String(template.dueDay).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        className={styles.edit}
                        aria-label={`Editar ${template.name}`}
                        onClick={() => setEditing({ id: template.id })}
                      >
                        <span className={styles.name}>{template.name}</span>
                        {template.autoPaid && (
                          <span className={styles.tag}>automática</span>
                        )}
                        {!template.active && (
                          <span className={styles.tag}>desativada</span>
                        )}
                      </button>
                      <span className={styles.value}>
                        {formatCents(template.amountCents)}
                      </span>
                      <Switch
                        checked={template.active}
                        label={`${template.name} ${template.active ? "ativa" : "desativada"}`}
                        onChange={() => toggle(template)}
                      />
                    </li>
                  ),
                )}
              </ul>

              {creating && (
                <TemplateForm
                  title="nova conta recorrente"
                  initial={null}
                  group={group}
                  onSave={save}
                  onCancel={() => setEditing(null)}
                />
              )}

              <button
                type="button"
                className={styles.add}
                onClick={() => setEditing({ group })}
              >
                <span className={styles.plus}>+</span>
                nova conta
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
