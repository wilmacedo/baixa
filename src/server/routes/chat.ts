import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import type { Conversations } from "../chat/conversations";
import type { ChatEngine } from "../chat/engine";
import { createLimiter } from "../chat/engine";
import { notFound, readBody } from "../http";

const messageInput = z.object({ text: z.string().trim().min(1).max(4000) });

const MAX_CONCURRENT_REPLIES = 2;

export function chatRoutes(conversations: Conversations, engine?: ChatEngine) {
  const routes = new Hono();
  const limiter = createLimiter(MAX_CONCURRENT_REPLIES);
  const replying = new Set<string>();

  routes.get("/status", async (c) =>
    c.json({ available: engine ? await engine.available() : false }),
  );

  routes.get("/conversations", (c) => c.json(conversations.list()));

  routes.post("/conversations", (c) => c.json(conversations.create(), 201));

  routes.get("/conversations/:id", (c) => {
    const conversation = conversations.get(c.req.param("id"));
    if (!conversation) throw notFound("Conversation");
    return c.json({
      conversation,
      messages: conversations.messages(conversation.id),
    });
  });

  routes.delete("/conversations/:id", (c) => {
    if (!conversations.delete(c.req.param("id"))) {
      throw notFound("Conversation");
    }
    return c.body(null, 204);
  });

  routes.post("/conversations/:id/messages", async (c) => {
    const conversation = conversations.get(c.req.param("id"));
    if (!conversation) throw notFound("Conversation");
    const { text } = await readBody(c, messageInput);

    if (!engine || !(await engine.available())) {
      throw new HTTPException(503, { message: "The assistant is not set up." });
    }
    if (replying.has(conversation.id)) {
      throw new HTTPException(409, {
        message: "The assistant is still replying.",
      });
    }

    replying.add(conversation.id);
    conversations.addMessage(conversation.id, "user", text);

    return streamSSE(c, async (stream) => {
      const controller = new AbortController();
      stream.onAbort(() => controller.abort());
      const release = await limiter.acquire();
      let reply = "";
      let alive = false;

      try {
        for await (const event of engine.reply({
          prompt: text,
          sessionId: conversation.sessionId,
          resume: conversation.started,
          signal: controller.signal,
        })) {
          if (event.type !== "error") alive = true;
          if (event.type === "delta") reply += event.text;
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event),
          });
        }
      } finally {
        release();
        replying.delete(conversation.id);
        if (alive) conversations.markStarted(conversation.id);
        if (reply)
          conversations.addMessage(conversation.id, "assistant", reply);
      }
    });
  });

  return routes;
}
