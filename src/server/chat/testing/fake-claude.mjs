const args = process.argv.slice(2);
const emit = (value) => console.log(JSON.stringify(value));
const delta = (text) =>
  emit({
    type: "stream_event",
    event: { type: "content_block_delta", delta: { type: "text_delta", text } },
  });

if (args[0] === "auth") {
  emit({ loggedIn: process.env.LANG !== "logged-out" });
  process.exit(0);
}

let prompt = "";
for await (const chunk of process.stdin) prompt += chunk;

if (prompt === "crash") {
  console.error("boom: something broke");
  process.exit(1);
}
if (prompt === "hang") setInterval(() => {}, 1000);
if (prompt === "hang") await new Promise(() => {});

if (prompt === "login") {
  emit({
    type: "result",
    is_error: true,
    result: "Not logged in · Please run /login",
  });
  process.exit(0);
}
if (prompt === "limit") {
  emit({
    type: "result",
    is_error: true,
    result: "Claude usage limit reached",
  });
  process.exit(0);
}
if (prompt === "inspect") {
  delta(JSON.stringify({ args, env: Object.keys(process.env).sort() }));
  emit({ type: "result", is_error: false, result: "" });
  process.exit(0);
}
if (prompt === "final-only") {
  emit({ type: "result", is_error: false, result: "Only at the end" });
  process.exit(0);
}

emit({ type: "system", subtype: "init" });
emit({
  type: "stream_event",
  event: {
    type: "content_block_start",
    content_block: { type: "tool_use", name: "mcp__baixa__month_summary" },
  },
});
emit({
  type: "stream_event",
  parent_tool_use_id: "sub",
  event: {
    type: "content_block_delta",
    delta: { type: "text_delta", text: "ignored" },
  },
});
delta("Olá");
delta(", mundo");
emit({ type: "result", is_error: false, result: "Olá, mundo" });
