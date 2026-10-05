import { describe, expect, it } from "vitest";
import {
  type ChatAction,
  chatReducer,
  ERROR_TEXT,
  initialChatState,
  toolLabel,
} from "./chat-state";

const run = (...actions: ChatAction[]) =>
  actions.reduce(chatReducer, initialChatState);

const delta = (text: string): ChatAction => ({
  type: "event",
  event: { type: "delta", text },
});

describe("chatReducer", () => {
  it("shows the question and an empty reply while thinking", () => {
    const state = run({ type: "sent", text: "Oi" });

    expect(state.phase).toBe("thinking");
    expect(state.messages.map((m) => [m.role, m.text])).toEqual([
      ["user", "Oi"],
      ["assistant", ""],
    ]);
  });

  it("appends streamed text to the reply and moves to streaming", () => {
    const state = run(
      { type: "sent", text: "Oi" },
      delta("Olá"),
      delta(", mundo"),
    );

    expect(state.phase).toBe("streaming");
    expect(state.messages.at(-1)?.text).toBe("Olá, mundo");
  });

  it("names the tool being used until text arrives", () => {
    const working = run(
      { type: "sent", text: "Oi" },
      {
        type: "event",
        event: { type: "tool", name: "mcp__baixa__month_summary" },
      },
    );
    expect(working.tool).toBe("somando o mês…");
    expect(chatReducer(working, delta("x")).tool).toBeNull();
  });

  it("goes idle when the reply is done", () => {
    const state = run({ type: "sent", text: "Oi" }, delta("ok"), {
      type: "event",
      event: { type: "done" },
    });

    expect(state.phase).toBe("idle");
    expect(state.error).toBeNull();
  });

  it("turns an error event into a message and drops the empty reply", () => {
    const state = run(
      { type: "sent", text: "Oi" },
      {
        type: "event",
        event: { type: "error", code: "limit", message: "x" },
      },
    );

    expect(state.error).toBe(ERROR_TEXT.limit);
    expect(state.messages.map((m) => m.role)).toEqual(["user"]);
  });

  it("keeps a partial reply when it fails midway or is stopped", () => {
    const partial = run({ type: "sent", text: "Oi" }, delta("Meio"));

    expect(
      chatReducer(partial, { type: "stopped" }).messages.at(-1)?.text,
    ).toBe("Meio");
    expect(
      chatReducer(partial, { type: "failed", message: "x" }).messages,
    ).toHaveLength(2);
  });

  it("does not stack an empty reply when the user retries", () => {
    const state = run(
      { type: "sent", text: "Oi" },
      { type: "failed", message: "x" },
      { type: "sent", text: "Oi" },
    );

    expect(state.messages.map((m) => m.role)).toEqual([
      "user",
      "user",
      "assistant",
    ]);
    expect(state.error).toBeNull();
  });

  it("loads a stored conversation and resets", () => {
    const loaded = run({
      type: "loaded",
      conversationId: "c1",
      messages: [{ id: 1, role: "user", text: "Oi", createdAt: "" }],
    });

    expect(loaded.conversationId).toBe("c1");
    expect(loaded.messages).toHaveLength(1);
    expect(chatReducer(loaded, { type: "reset" })).toEqual(initialChatState);
  });
});

describe("toolLabel", () => {
  it("falls back to a generic label for an unknown tool", () => {
    expect(toolLabel("mcp__baixa__other")).toBe("consultando seus dados…");
  });
});
