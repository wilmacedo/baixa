import { useEffect, useRef } from "react";
import { Kbd } from "./Kbd";
import styles from "./ShortcutsHelp.module.css";

const SHORTCUTS: Array<{ keys: string[]; text: string }> = [
  { keys: ["N", "0–9"], text: "novo gasto (ou comece digitando o valor)" },
  { keys: ["↑", "↓"], text: "percorrer as contas" },
  { keys: ["←", "→"], text: "trocar de coluna" },
  { keys: ["espaço"], text: "dar baixa / voltar para pendente" },
  { keys: ["enter", "E"], text: "editar o valor só deste mês" },
  { keys: ["P"], text: "mostrar ou ocultar pagas" },
  { keys: ["[", "]"], text: "mês anterior / próximo" },
  { keys: ["H"], text: "voltar para o mês atual" },
  { keys: ["Z", "⌘Z"], text: "desfazer a última ação" },
  { keys: ["M", "R"], text: "tela do mês / recorrentes" },
  { keys: ["T"], text: "trocar tema (folha / carbono)" },
  { keys: ["esc"], text: "fechar ou cancelar" },
  { keys: ["enter"], text: "no gasto: avança e salva" },
  { keys: ["⌘", "enter"], text: "no gasto: salva de qualquer campo" },
  {
    keys: ["C", "M", "S", "T", "L", "O"],
    text: "no gasto: escolhe a categoria",
  },
  { keys: ["→"], text: "na descrição: aceita a sugestão" },
];

interface ShortcutsHelpProps {
  onClose: () => void;
}

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => dialog.current?.showModal(), []);

  return (
    <dialog
      ref={dialog}
      aria-label="Atalhos de teclado"
      className={styles.dialog}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className={styles.head}>
        <h2 className={styles.title}>atalhos</h2>
        <span className={styles.grow} />
        <span className={styles.close}>esc fecha</span>
      </div>
      <ul className={styles.list}>
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.text} className={styles.item}>
            <span className={styles.keys}>
              {shortcut.keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
            <span className={styles.text}>{shortcut.text}</span>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
