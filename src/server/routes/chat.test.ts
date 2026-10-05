import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import type { ChatEngine, ChatEvent, ReplyInput } from "../chat/engine";
import { type Db, openDatabase } from "../db";

let db: Db;
let calls: ReplyInput[];
let script: ChatEvent[];
let available: boolean;
let app: ReturnType<typeof createApp>;

const engine: ChatEngine = {
  available: async () => available,
  async *reply(input) {
    calls.push(input);
    for (const event of script) yield event;
  },
};

beforeEach(() => {
  db = openDatabase(":memory:");
  calls = [];
  available = true;
  script = [
    { type: "tool", name: "mcp__baixa__today" },
    { type: "delta", text: "Falta " },
    { type: "delta", text: "R$ 10,00." },
    { type: "done" },
  ];
  app = createApp(db, { chatEngine: engine });
});

afterEach(() => db.close());

const send = (method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const create = async () =>
  (await (await send("POST", "/api/chat/conversations")).json()) as {
    id: string;
  };

async function sse(res: Response) {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      return {
        event: lines.find((l) => l.startsWith("event:"))?.slice(7),
        data: JSON.parse(
          lines.find((l) => l.startsWith("data:"))?.slice(6) ?? "null",
        ),
      };
    });
}

describe("chat status", () => {
  it("reports whether the assistant can answer", async () => {
    expect(await (await send("GET", "/api/chat/status")).json()).toEqual({
      available: true,
    });
    available = false;
    expect(await (await send("GET", "/api/chat/status")).json()).toEqual({
      available: false,
    });
  });

  it("is unavailable when no engine is configured", async () => {
    const bare = createApp(db);
    const res = await bare.request("/api/chat/status");

    expect(await res.json()).toEqual({ available: false });
  });
});

describe("conversations", () => {
  it("creates, lists, reads and deletes", async () => {
    const { id } = await create();

    expect(
      await (await send("GET", "/api/chat/conversations")).json(),
    ).toHaveLength(1);
    expect((await send("GET", `/api/chat/conversations/${id}`)).status).toBe(
      200,
    );
    expect((await send("DELETE", `/api/chat/conversations/${id}`)).status).toBe(
      204,
    );
    expect((await send("GET", `/api/chat/conversations/${id}`)).status).toBe(
      404,
    );
  });

  it("returns 404 for an unknown conversation", async () => {
    expect((await send("DELETE", "/api/chat/conversations/nope")).status).toBe(
      404,
    );
    expect(
      (
        await send("POST", "/api/chat/conversations/nope/messages", {
          text: "oi",
        })
      ).status,
    ).toBe(404);
  });
});

describe("sending a message", () => {
  it("streams the events and stores both sides of the exchange", async () => {
    const { id } = await create();
    const res = await send("POST", `/api/chat/conversations/${id}/messages`, {
      text: "Quanto falta?",
    });

    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect((await sse(res)).map((e) => e.event)).toEqual([
      "tool",
      "delta",
      "delta",
      "done",
    ]);

    const { messages } = await (
      await send("GET", `/api/chat/conversations/${id}`)
    ).json();
    expect(
      messages.map((m: { role: string; text: string }) => [m.role, m.text]),
    ).toEqual([
      ["user", "Quanto falta?"],
      ["assistant", "Falta R$ 10,00."],
    ]);
  });

  it("starts the session on the first turn and resumes it on the next", async () => {
    const { id } = await create();
    for (const text of ["um", "dois"]) {
      await (
        await send("POST", `/api/chat/conversations/${id}/messages`, { text })
      ).text();
    }

    expect(calls.map((c) => c.resume)).toEqual([false, true]);
    expect(calls[0]?.sessionId).toBe(calls[1]?.sessionId);
  });

  it("does not mark the session started after an immediate failure", async () => {
    script = [{ type: "error", code: "auth", message: "Please run /login" }];
    const { id } = await create();
    const res = await send("POST", `/api/chat/conversations/${id}/messages`, {
      text: "oi",
    });

    expect(await sse(res)).toEqual([
      {
        event: "error",
        data: { type: "error", code: "auth", message: "Please run /login" },
      },
    ]);
    const { conversation, messages } = await (
      await send("GET", `/api/chat/conversations/${id}`)
    ).json();
    expect(conversation.started).toBe(false);
    expect(messages).toHaveLength(1);
  });

  it("refuses when the assistant is not set up", async () => {
    available = false;
    const { id } = await create();
    const res = await send("POST", `/api/chat/conversations/${id}/messages`, {
      text: "oi",
    });

    expect(res.status).toBe(503);
    expect(calls).toEqual([]);
  });

  it.each([{ text: "" }, { text: "   " }, { text: "x".repeat(4001) }, {}])(
    "rejects an invalid body %j",
    async (body) => {
      const { id } = await create();

      expect(
        (await send("POST", `/api/chat/conversations/${id}/messages`, body))
          .status,
      ).toBe(400);
    },
  );

  it("allows one reply at a time per conversation", async () => {
    let finish: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const slow: ChatEngine = {
      available: async () => true,
      async *reply() {
        await gate;
        yield { type: "done" };
      },
    };
    app = createApp(db, { chatEngine: slow });
    const { id } = await create();

    const first = send("POST", `/api/chat/conversations/${id}/messages`, {
      text: "um",
    });
    await new Promise((r) => setTimeout(r, 20));
    const second = await send(
      "POST",
      `/api/chat/conversations/${id}/messages`,
      { text: "dois" },
    );

    expect(second.status).toBe(409);
    finish();
    await (await first).text();
  });
});
