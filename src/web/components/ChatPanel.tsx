import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ChatState } from "../chat-state";
import { useShake } from "../use-shake";
import type { Mode } from "../use-viewport";
import { ChatMarkdown } from "./ChatMarkdown";
import styles from "./ChatPanel.module.css";

const SUGGESTIONS = [
  "Quanto falta pagar este mês?",
  "Quais contas estão atrasadas?",
  "Quanto gastei com mercado nos últimos 3 meses?",
  "O que mais subiu de valor?",
];

const MAX_INPUT_HEIGHT = 120;
const CLOSE_FALLBACK_MS = 400;
const STICK_TO_BOTTOM = 80;

interface ChatPanelProps {
  mode: Mode;
  state: ChatState;
  onSend: (text: string) => void;
  onStop: () => void;
  onStartOver: () => void;
  onClose: () => void;
}

export function ChatPanel({
  mode,
  state,
  onSend,
  onStop,
  onStartOver,
  onClose,
}: ChatPanelProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [closing, setClosing] = useState(false);
  const shake = useShake();
  const busy = state.phase !== "idle";

  const freshness = useRef(new Map<string, boolean>());
  const mounted = useRef(false);
  for (const message of state.messages) {
    if (!freshness.current.has(message.key)) {
      freshness.current.set(message.key, mounted.current);
    }
  }
  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    dialog.current?.showModal();
    input.current?.focus();
  }, []);

  const requestClose = () => setClosing(true);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(onClose, CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the conversation grows
  useEffect(() => {
    const el = log.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < STICK_TO_BOTTOM || state.phase === "thinking") {
      el.scrollTop = el.scrollHeight;
    }
  }, [state.messages, state.tool, state.phase, state.error]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refit the field whenever the draft changes
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [draft]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return onStop();
    if (!draft.trim()) return shake.shake();
    onSend(draft);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!busy) submit();
    } else if (event.key === "ArrowUp" && draft === "" && lastAsked) {
      event.preventDefault();
      setDraft(lastAsked);
    }
  };

  const empty = state.messages.length === 0;
  const lastAsked = state.messages.findLast((m) => m.role === "user")?.text;
  const streamingKey =
    state.phase === "streaming" ? state.messages.at(-1)?.key : undefined;
  const retry = state.error && state.lastQuestion;

  return (
    <dialog
      ref={dialog}
      aria-label="Assistente"
      className={styles.dialog}
      data-mode={mode}
      data-closing={closing}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          requestClose();
        }
      }}
      onAnimationEnd={(event) => {
        if (closing && event.target === dialog.current) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) requestClose();
      }}
    >
      <div className={styles.panel}>
        <header className={styles.head}>
          <h2 className={styles.title}>assistente</h2>
          <span className={styles.grow} />
          {!empty && (
            <button
              type="button"
              className={styles.action}
              onClick={onStartOver}
            >
              nova conversa
            </button>
          )}
          <button
            type="button"
            className={styles.action}
            onClick={requestClose}
          >
            fechar
          </button>
        </header>

        <div
          ref={log}
          role="log"
          aria-live="polite"
          aria-busy={busy}
          className={styles.log}
        >
          {empty && (
            <div className={styles.empty}>
              <p className={styles.hello}>
                Pergunte sobre suas contas, gastos e meses anteriores.
              </p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.chip}
                    style={{ "--i": index } as CSSProperties}
                    disabled={busy}
                    onClick={() => onSend(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.messages.map((message) =>
            message.role === "assistant" && message.text === "" ? null : (
              <div
                key={message.key}
                className={styles.message}
                data-role={message.role}
                data-fresh={freshness.current.get(message.key)}
                data-streaming={message.key === streamingKey}
              >
                {message.role === "assistant" ? (
                  <ChatMarkdown text={message.text} />
                ) : (
                  <p>{message.text}</p>
                )}
              </div>
            ),
          )}

          {busy && state.messages.at(-1)?.text === "" && (
            <div className={styles.working} role="status">
              <span aria-hidden="true" className={styles.dots}>
                <i />
                <i />
                <i />
              </span>
              {state.tool ?? "pensando…"}
            </div>
          )}

          {state.error && (
            <div role="alert" className={styles.error}>
              <span>{state.error}</span>
              {retry && (
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => onSend(state.lastQuestion as string)}
                >
                  tentar de novo
                </button>
              )}
            </div>
          )}
        </div>

        <form className={styles.composer} onSubmit={submit}>
          <textarea
            ref={input}
            className={styles.input}
            rows={1}
            style={{ transform: shake.transform }}
            aria-label="Mensagem para o assistente"
            placeholder="Pergunte algo…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className={styles.send}
            data-busy={busy}
            disabled={!busy && !draft.trim()}
          >
            {busy ? "parar" : "enviar"}
          </button>
        </form>
        {mode === "desktop" && (
          <p className={styles.hint}>
            enter envia · shift enter quebra a linha · ↑ repete a última · esc
            fecha
          </p>
        )}
      </div>
    </dialog>
  );
}
