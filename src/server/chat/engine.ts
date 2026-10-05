import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { ChatErrorCode, ChatEvent } from "../../shared/chat";

export type { ChatErrorCode, ChatEvent };

export interface ReplyInput {
  prompt: string;
  sessionId: string;
  resume: boolean;
  signal?: AbortSignal;
}

export interface ChatEngine {
  available(): Promise<boolean>;
  reply(input: ReplyInput): AsyncGenerator<ChatEvent>;
}

export interface ClaudeEngineConfig {
  command: string;
  prefixArgs?: string[];
  model: string;
  systemPrompt: string;
  mcpUrl: string;
  cwd: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}

const PASSED_ENV = [
  "PATH",
  "HOME",
  "TZ",
  "LANG",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CONFIG_DIR",
];
const AVAILABILITY_TTL_MS = 30_000;
const MAX_STDERR = 2_000;

export function childEnv(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  };
  for (const key of PASSED_ENV) {
    if (source[key] !== undefined) env[key] = source[key];
  }
  return env;
}

export function claudeArgs(
  config: ClaudeEngineConfig,
  input: Pick<ReplyInput, "sessionId" | "resume">,
): string[] {
  return [
    ...(config.prefixArgs ?? []),
    "-p",
    "--model",
    config.model,
    "--verbose",
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--system-prompt",
    config.systemPrompt,
    "--tools",
    "",
    "--setting-sources",
    "",
    "--strict-mcp-config",
    "--mcp-config",
    JSON.stringify({
      mcpServers: { baixa: { type: "http", url: config.mcpUrl } },
    }),
    "--allowedTools",
    "mcp__baixa__*",
    input.resume ? "--resume" : "--session-id",
    input.sessionId,
  ];
}

export function classifyFailure(text: string): ChatErrorCode {
  if (/log ?in|credential|oauth|authenticat|invalid api key|401/i.test(text)) {
    return "auth";
  }
  if (/limit|quota|rate|overloaded|429/i.test(text)) return "limit";
  return "failed";
}

type Line = Record<string, unknown>;

const asRecord = (value: unknown): Line =>
  typeof value === "object" && value !== null ? (value as Line) : {};

export function mapLine(line: Line): ChatEvent | null {
  if (line.type === "stream_event" && !line.parent_tool_use_id) {
    const event = asRecord(line.event);
    if (event.type === "content_block_delta") {
      const delta = asRecord(event.delta);
      if (delta.type === "text_delta" && typeof delta.text === "string") {
        return { type: "delta", text: delta.text };
      }
    }
    if (event.type === "content_block_start") {
      const block = asRecord(event.content_block);
      if (block.type === "tool_use" && typeof block.name === "string") {
        return { type: "tool", name: block.name };
      }
    }
  }
  return null;
}

export function createClaudeEngine(config: ClaudeEngineConfig): ChatEngine {
  const environment = () => childEnv(config.env ?? process.env);
  let cached: { at: number; value: boolean } | undefined;

  const checkLogin = () =>
    new Promise<boolean>((resolve) => {
      const child = spawn(
        config.command,
        [...(config.prefixArgs ?? []), "auth", "status", "--json"],
        {
          env: environment(),
          cwd: config.cwd,
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
      let out = "";
      child.stdout.on("data", (chunk) => {
        out += chunk;
      });
      child.on("error", () => resolve(false));
      child.on("close", () => {
        try {
          resolve(asRecord(JSON.parse(out)).loggedIn === true);
        } catch {
          resolve(false);
        }
      });
    });

  return {
    async available() {
      if (cached && Date.now() - cached.at < AVAILABILITY_TTL_MS) {
        return cached.value;
      }
      const value = await checkLogin();
      cached = { at: Date.now(), value };
      return value;
    },

    async *reply(input) {
      const child = spawn(config.command, claudeArgs(config, input), {
        env: environment(),
        cwd: config.cwd,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stderr = "";
      let timedOut = false;
      let spawnError: Error | undefined;
      child.stderr.on("data", (chunk) => {
        stderr = (stderr + chunk).slice(-MAX_STDERR);
      });
      child.on("error", (error) => {
        spawnError = error;
      });
      child.stdin.on("error", () => {});
      child.stdin.end(input.prompt);

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, config.timeoutMs);
      const stop = () => child.kill("SIGKILL");
      input.signal?.addEventListener("abort", stop);

      const exited = new Promise<number | null>((resolve) =>
        child.on("close", resolve),
      );

      let sawText = false;
      let finished = false;
      try {
        const lines = createInterface({ input: child.stdout });
        for await (const raw of lines) {
          let line: Line;
          try {
            line = asRecord(JSON.parse(raw));
          } catch {
            continue;
          }

          const event = mapLine(line);
          if (event) {
            if (event.type === "delta") sawText = true;
            yield event;
            continue;
          }

          if (line.type === "result") {
            finished = true;
            const text = typeof line.result === "string" ? line.result : "";
            if (line.is_error === true) {
              yield {
                type: "error",
                code: classifyFailure(text),
                message: text,
              };
            } else {
              if (!sawText && text) yield { type: "delta", text };
              yield { type: "done" };
            }
          }
        }
        await exited;
      } finally {
        clearTimeout(timer);
        input.signal?.removeEventListener("abort", stop);
        if (child.exitCode === null) child.kill("SIGKILL");
      }

      if (finished || input.signal?.aborted) return;
      if (timedOut) {
        yield {
          type: "error",
          code: "timeout",
          message: "The reply took too long.",
        };
      } else if (spawnError) {
        yield {
          type: "error",
          code: "unavailable",
          message: spawnError.message,
        };
      } else {
        yield {
          type: "error",
          code: classifyFailure(stderr),
          message: stderr.trim() || "The assistant stopped without a reply.",
        };
      }
    },
  };
}

export function createLimiter(max: number) {
  let running = 0;
  const waiting: (() => void)[] = [];

  return {
    async acquire(): Promise<() => void> {
      if (running >= max) await new Promise<void>((r) => waiting.push(r));
      else running += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const next = waiting.shift();
        if (next) next();
        else running -= 1;
      };
    },
  };
}
