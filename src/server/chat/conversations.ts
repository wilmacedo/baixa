import { randomUUID } from "node:crypto";
import type { ChatMessage } from "../../shared/chat";
import type { Db } from "../db";

export type { ChatMessage };

export interface Conversation {
  id: string;
  title: string;
  sessionId: string;
  started: boolean;
  createdAt: string;
}

interface ConversationRow {
  id: string;
  title: string;
  session_id: string;
  started: number;
  created_at: string;
}

const DEFAULT_TITLE = "Nova conversa";
const TITLE_LENGTH = 60;

const toConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  title: row.title,
  sessionId: row.session_id,
  started: row.started === 1,
  createdAt: row.created_at,
});

export function createConversations(
  db: Db,
  now: () => Date = () => new Date(),
) {
  const columns = "id, title, session_id, started, created_at";
  const insert = db.prepare(
    `INSERT INTO chat_conversations (${columns})
     VALUES (@id, @title, @session_id, 0, @created_at)`,
  );
  const selectAll = db.prepare(
    `SELECT ${columns} FROM chat_conversations ORDER BY rowid DESC`,
  );
  const selectOne = db.prepare(
    `SELECT ${columns} FROM chat_conversations WHERE id = ?`,
  );
  const selectMessages = db.prepare(
    `SELECT id, role, text, created_at AS createdAt FROM chat_messages
     WHERE conversation_id = ? ORDER BY id`,
  );
  const insertMessage = db.prepare(
    `INSERT INTO chat_messages (conversation_id, role, text, created_at)
     VALUES (?, ?, ?, ?)`,
  );
  const setTitle = db.prepare(
    "UPDATE chat_conversations SET title = ? WHERE id = ? AND title = ?",
  );
  const setStarted = db.prepare(
    "UPDATE chat_conversations SET started = 1 WHERE id = ?",
  );
  const remove = db.prepare("DELETE FROM chat_conversations WHERE id = ?");

  const get = (id: string): Conversation | undefined => {
    const row = selectOne.get(id) as ConversationRow | undefined;
    return row && toConversation(row);
  };

  return {
    create(): Conversation {
      const id = randomUUID();
      insert.run({
        id,
        title: DEFAULT_TITLE,
        session_id: randomUUID(),
        created_at: now().toISOString(),
      });
      return get(id) as Conversation;
    },

    list: (): Conversation[] =>
      (selectAll.all() as ConversationRow[]).map(toConversation),

    get,

    messages: (id: string): ChatMessage[] =>
      selectMessages.all(id) as ChatMessage[],

    addMessage(id: string, role: ChatMessage["role"], text: string) {
      insertMessage.run(id, role, text, now().toISOString());
      if (role === "user") {
        const title = text.replace(/\s+/g, " ").trim().slice(0, TITLE_LENGTH);
        setTitle.run(title, id, DEFAULT_TITLE);
      }
    },

    markStarted: (id: string) => void setStarted.run(id),

    delete: (id: string): boolean => remove.run(id).changes > 0,
  };
}

export type Conversations = ReturnType<typeof createConversations>;
