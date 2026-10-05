import { describe, expect, it } from "vitest";
import { parseSse } from "./chat-stream";

const frame = (event: object) =>
  `event: ${(event as { type: string }).type}\ndata: ${JSON.stringify(event)}\n\n`;

describe("parseSse", () => {
  it("reads complete events and keeps the unfinished tail", () => {
    const input = `${frame({ type: "delta", text: "Olá" })}${frame({ type: "done" })}event: delta\ndata: {"ty`;
    const { events, rest } = parseSse(input);

    expect(events).toEqual([{ type: "delta", text: "Olá" }, { type: "done" }]);
    expect(rest).toBe('event: delta\ndata: {"ty');
  });

  it("completes an event split across two chunks", () => {
    const whole = frame({ type: "delta", text: "ação" });
    const first = parseSse(whole.slice(0, 20));
    const second = parseSse(first.rest + whole.slice(20));

    expect(first.events).toEqual([]);
    expect(second.events).toEqual([{ type: "delta", text: "ação" }]);
  });

  it("accepts CRLF line endings", () => {
    const { events } = parseSse('event: done\r\ndata: {"type":"done"}\r\n\r\n');

    expect(events).toEqual([{ type: "done" }]);
  });

  it("skips blocks without data or with invalid JSON", () => {
    const { events } = parseSse(": keep-alive\n\ndata: not json\n\n");

    expect(events).toEqual([]);
  });
});
