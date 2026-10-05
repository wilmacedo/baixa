import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "../db";
import { type Conversations, createConversations } from "./conversations";

let db: Db;
let conversations: Conversations;

beforeEach(() => {
  db = openDatabase(":memory:");
  conversations = createConversations(
    db,
    () => new Date("2026-10-05T12:00:00Z"),
  );
});

afterEach(() => db.close());

describe("conversations", () => {
  it("creates a conversation with its own session id, not started", () => {
    const first = conversations.create();
    const second = conversations.create();

    expect(first).toMatchObject({ title: "Nova conversa", started: false });
    expect(first.sessionId).not.toBe(second.sessionId);
  });

  it("lists the newest first", () => {
    const first = conversations.create();
    const second = conversations.create();

    expect(conversations.list().map((c) => c.id)).toEqual([
      second.id,
      first.id,
    ]);
  });

  it("keeps messages in order", () => {
    const { id } = conversations.create();
    conversations.addMessage(id, "user", "Oi");
    conversations.addMessage(id, "assistant", "Olá!");

    expect(conversations.messages(id).map((m) => [m.role, m.text])).toEqual([
      ["user", "Oi"],
      ["assistant", "Olá!"],
    ]);
  });

  it("titles the conversation after the first question only", () => {
    const { id } = conversations.create();
    conversations.addMessage(id, "user", "  Quanto falta\n pagar este mês?  ");
    conversations.addMessage(id, "user", "E o mês passado?");

    expect(conversations.get(id)?.title).toBe("Quanto falta pagar este mês?");
  });

  it("marks a conversation as started", () => {
    const { id } = conversations.create();
    conversations.markStarted(id);

    expect(conversations.get(id)?.started).toBe(true);
  });

  it("deletes a conversation with its messages", () => {
    const { id } = conversations.create();
    conversations.addMessage(id, "user", "Oi");

    expect(conversations.delete(id)).toBe(true);
    expect(conversations.get(id)).toBeUndefined();
    expect(conversations.messages(id)).toEqual([]);
    expect(conversations.delete(id)).toBe(false);
  });
});
