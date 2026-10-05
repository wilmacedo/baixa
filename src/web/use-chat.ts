import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ApiError, chatApi } from "./api";
import {
  BUSY_TEXT,
  chatReducer,
  ERROR_TEXT,
  initialChatState,
} from "./chat-state";
import { streamReply } from "./chat-stream";

export function useChat(open: boolean) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [available, setAvailable] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const loaded = useRef(false);
  const conversationId = useRef<string | null>(null);
  conversationId.current = state.conversationId;

  useEffect(() => {
    chatApi.status().then(
      (status) => setAvailable(status.available),
      () => setAvailable(false),
    );
  }, []);

  useEffect(() => {
    if (!open || !available || loaded.current) return;
    loaded.current = true;
    chatApi
      .conversations()
      .then(async (list) => {
        const latest = list[0];
        if (!latest || conversationId.current) return;
        const { messages } = await chatApi.getConversation(latest.id);
        if (!conversationId.current) {
          dispatch({ type: "loaded", conversationId: latest.id, messages });
        }
      })
      .catch(() => {});
  }, [open, available]);

  const send = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || controller.current) return;

    dispatch({ type: "sent", text: question });
    const abort = new AbortController();
    controller.current = abort;
    try {
      let id = conversationId.current;
      if (!id) {
        id = (await chatApi.createConversation()).id;
        conversationId.current = id;
        dispatch({ type: "conversation", conversationId: id });
      }
      await streamReply(id, question, abort.signal, (event) =>
        dispatch({ type: "event", event }),
      );
      dispatch({ type: "event", event: { type: "done" } });
    } catch (error) {
      if (abort.signal.aborted) return;
      dispatch({
        type: "failed",
        message:
          error instanceof ApiError && error.status === 409
            ? BUSY_TEXT
            : error instanceof ApiError && error.status === 503
              ? ERROR_TEXT.unavailable
              : ERROR_TEXT.failed,
      });
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    dispatch({ type: "stopped" });
  }, []);

  const startOver = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    dispatch({ type: "reset" });
  }, []);

  return { available, state, send, stop, startOver };
}
