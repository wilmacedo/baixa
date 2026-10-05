import type { ChatEvent } from "../shared/chat";
import { ApiError } from "./api";

const BLOCK_END = /\r?\n\r?\n/;

export function parseSse(buffer: string): {
  events: ChatEvent[];
  rest: string;
} {
  const blocks = buffer.split(BLOCK_END);
  const rest = blocks.pop() ?? "";
  const events: ChatEvent[] = [];

  for (const block of blocks) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      events.push(JSON.parse(data) as ChatEvent);
    } catch {}
  }
  return { events, rest };
}

export async function streamReply(
  conversationId: string,
  text: string,
  signal: AbortSignal,
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  const res = await fetch(
    `/api/chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal,
    },
  );
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSse(buffer);
    buffer = parsed.rest;
    for (const event of parsed.events) onEvent(event);
  }
}
