import type { ChatErrorCode, ChatEvent, ChatMessage } from "../shared/chat";

export interface UiMessage {
  key: string;
  role: "user" | "assistant";
  text: string;
}

export interface ChatState {
  conversationId: string | null;
  messages: UiMessage[];
  phase: "idle" | "thinking" | "streaming";
  tool: string | null;
  error: string | null;
  lastQuestion: string | null;
}

export type ChatAction =
  | { type: "loaded"; conversationId: string; messages: ChatMessage[] }
  | { type: "reset" }
  | { type: "conversation"; conversationId: string }
  | { type: "sent"; text: string }
  | { type: "event"; event: ChatEvent }
  | { type: "failed"; message: string }
  | { type: "stopped" };

export const initialChatState: ChatState = {
  conversationId: null,
  messages: [],
  phase: "idle",
  tool: null,
  error: null,
  lastQuestion: null,
};

export const ERROR_TEXT: Record<ChatErrorCode, string> = {
  unavailable: "O assistente não está configurado neste servidor.",
  auth: "O assistente perdeu o acesso à sua conta. Gere um novo token e reinicie o Baixa.",
  limit: "O limite da sua assinatura foi atingido. Tente de novo mais tarde.",
  timeout: "A resposta demorou demais. Tente de novo.",
  failed: "Não consegui responder agora. Tente de novo.",
};

export const BUSY_TEXT =
  "O assistente ainda está respondendo. Aguarde um instante.";

const TOOL_LABELS: Record<string, string> = {
  today: "olhando a data de hoje",
  month_summary: "somando o mês",
  list_bills: "conferindo as contas",
  bill_history: "buscando o histórico da conta",
  list_expenses: "somando os gastos avulsos",
  spending_trend: "comparando os meses",
  list_recurring: "olhando as contas recorrentes",
  run_sql: "consultando os dados",
};

export function toolLabel(name: string): string {
  const key = name.replace(/^mcp__baixa__/, "");
  return `${TOOL_LABELS[key] ?? "consultando seus dados"}…`;
}

let counter = 0;
const nextKey = () => `m${++counter}`;

const dropEmptyReply = (messages: UiMessage[]) => {
  const last = messages.at(-1);
  return last?.role === "assistant" && last.text === ""
    ? messages.slice(0, -1)
    : messages;
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "loaded":
      return {
        ...initialChatState,
        conversationId: action.conversationId,
        messages: action.messages.map((m) => ({
          key: `s${m.id}`,
          role: m.role,
          text: m.text,
        })),
      };

    case "reset":
      return initialChatState;

    case "conversation":
      return { ...state, conversationId: action.conversationId };

    case "sent":
      return {
        ...state,
        phase: "thinking",
        tool: null,
        error: null,
        lastQuestion: action.text,
        messages: [
          ...dropEmptyReply(state.messages),
          { key: nextKey(), role: "user", text: action.text },
          { key: nextKey(), role: "assistant", text: "" },
        ],
      };

    case "event": {
      const { event } = action;
      if (event.type === "tool") {
        return { ...state, tool: toolLabel(event.name) };
      }
      if (event.type === "delta") {
        const messages = [...state.messages];
        const last = messages.at(-1);
        if (last?.role !== "assistant") return state;
        messages[messages.length - 1] = {
          ...last,
          text: last.text + event.text,
        };
        return { ...state, phase: "streaming", tool: null, messages };
      }
      if (event.type === "error") {
        return {
          ...state,
          phase: "idle",
          tool: null,
          error: ERROR_TEXT[event.code],
          messages: dropEmptyReply(state.messages),
        };
      }
      return { ...state, phase: "idle", tool: null };
    }

    case "failed":
      return {
        ...state,
        phase: "idle",
        tool: null,
        error: action.message,
        messages: dropEmptyReply(state.messages),
      };

    case "stopped":
      return {
        ...state,
        phase: "idle",
        tool: null,
        messages: dropEmptyReply(state.messages),
      };
  }
}
