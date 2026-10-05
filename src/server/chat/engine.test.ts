import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type ChatEvent,
  childEnv,
  classifyFailure,
  createClaudeEngine,
  createLimiter,
} from "./engine";

const fake = join(
  dirname(fileURLToPath(import.meta.url)),
  "testing/fake-claude.mjs",
);

const engine = (
  overrides: Partial<Parameters<typeof createClaudeEngine>[0]> = {},
) =>
  createClaudeEngine({
    command: process.execPath,
    prefixArgs: [fake],
    model: "haiku",
    systemPrompt: "system",
    mcpUrl: "http://127.0.0.1:1/mcp",
    cwd: process.cwd(),
    timeoutMs: 5_000,
    ...overrides,
  });

async function collect(
  target: ReturnType<typeof engine>,
  prompt: string,
  extra: { resume?: boolean; signal?: AbortSignal } = {},
) {
  const events: ChatEvent[] = [];
  for await (const event of target.reply({
    prompt,
    sessionId: "session-1",
    resume: extra.resume ?? false,
    signal: extra.signal,
  })) {
    events.push(event);
  }
  return events;
}

describe("claude engine", () => {
  it("streams text and tool use, ignoring sub-agent text", async () => {
    expect(await collect(engine(), "ok")).toEqual([
      { type: "tool", name: "mcp__baixa__month_summary" },
      { type: "delta", text: "Olá" },
      { type: "delta", text: ", mundo" },
      { type: "done" },
    ]);
  });

  it("falls back to the final result when nothing streamed", async () => {
    expect(await collect(engine(), "final-only")).toEqual([
      { type: "delta", text: "Only at the end" },
      { type: "done" },
    ]);
  });

  it("starts a session first and resumes it afterwards", async () => {
    const first = await collect(engine(), "inspect");
    const later = await collect(engine(), "inspect", { resume: true });
    const argsOf = (events: ChatEvent[]) =>
      JSON.parse((events[0] as { text: string }).text).args as string[];

    expect(argsOf(first)).toContain("--session-id");
    expect(argsOf(later)).toContain("--resume");
  });

  it("runs the model without built-in tools or user settings, with only the baixa MCP", async () => {
    const events = await collect(engine(), "inspect");
    const { args } = JSON.parse((events[0] as { text: string }).text);

    expect(args[args.indexOf("--tools") + 1]).toBe("");
    expect(args[args.indexOf("--setting-sources") + 1]).toBe("");
    expect(args).toContain("--strict-mcp-config");
    expect(args[args.indexOf("--allowedTools") + 1]).toBe("mcp__baixa__*");
  });

  it("gives the process only an allowlisted environment", async () => {
    const events = await collect(
      engine({
        env: {
          PATH: process.env.PATH,
          CLAUDE_CODE_OAUTH_TOKEN: "t",
          ANTHROPIC_API_KEY: "k",
          SECRET: "s",
        },
      }),
      "inspect",
    );
    const { env } = JSON.parse((events[0] as { text: string }).text);

    expect(env).toContain("CLAUDE_CODE_OAUTH_TOKEN");
    expect(env).not.toContain("ANTHROPIC_API_KEY");
    expect(env).not.toContain("SECRET");
  });

  it.each([
    ["login", "auth"],
    ["limit", "limit"],
    ["crash", "failed"],
  ])("reports %s as %s", async (prompt, code) => {
    const events = await collect(engine(), prompt);

    expect(events.at(-1)).toMatchObject({ type: "error", code });
  });

  it("reports a missing binary as unavailable", async () => {
    const events = await collect(
      engine({ command: "/nonexistent/claude", prefixArgs: [] }),
      "ok",
    );

    expect(events.at(-1)).toMatchObject({ type: "error", code: "unavailable" });
  });

  it("kills a reply that takes too long", async () => {
    const events = await collect(engine({ timeoutMs: 300 }), "hang");

    expect(events.at(-1)).toMatchObject({ type: "error", code: "timeout" });
  });

  it("stops quietly when the caller aborts", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 200);

    expect(
      await collect(engine(), "hang", { signal: controller.signal }),
    ).toEqual([]);
  });

  it("checks the login through the CLI and caches the answer", async () => {
    expect(await engine().available()).toBe(true);
    expect(await engine({ env: { LANG: "logged-out" } }).available()).toBe(
      false,
    );
  });
});

describe("childEnv", () => {
  it("never forwards an API key and turns off nonessential traffic", () => {
    const env = childEnv({ ANTHROPIC_API_KEY: "k", HOME: "/h" });

    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.HOME).toBe("/h");
    expect(env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe("1");
  });
});

describe("classifyFailure", () => {
  it.each([
    ["Invalid API key · Please run /login", "auth"],
    ["Claude AI usage limit reached", "limit"],
    ["something else", "failed"],
  ])("%s -> %s", (text, code) => {
    expect(classifyFailure(text)).toBe(code);
  });
});

describe("limiter", () => {
  it("lets only max callers run at once", async () => {
    const limiter = createLimiter(1);
    const order: string[] = [];
    const first = await limiter.acquire();
    const second = limiter.acquire().then((release) => {
      order.push("second");
      release();
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(order).toEqual([]);
    first();
    await second;
    expect(order).toEqual(["second"]);
  });
});
