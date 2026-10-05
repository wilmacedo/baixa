export type ChatErrorCode =
  | "unavailable"
  | "auth"
  | "limit"
  | "timeout"
  | "failed";

export type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "tool"; name: string }
  | { type: "done" }
  | { type: "error"; code: ChatErrorCode; message: string };

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
}
