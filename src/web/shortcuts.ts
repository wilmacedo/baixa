export type GlobalAction =
  | { type: "theme" | "help" | "chat" | "month" | "recurring" | "undo" }
  | { type: "newExpense"; digit?: string };

type KeyInput = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey">;

export function globalShortcut(event: KeyInput): GlobalAction | null {
  const modifier = event.metaKey || event.ctrlKey;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (modifier && key === "z") return { type: "undo" };
  if (modifier || event.altKey) return null;

  switch (key) {
    case "t":
      return { type: "theme" };
    case "?":
      return { type: "help" };
    case "c":
      return { type: "chat" };
    case "m":
      return { type: "month" };
    case "r":
      return { type: "recurring" };
    case "z":
      return { type: "undo" };
    case "n":
    case "+":
      return { type: "newExpense" };
  }
  return /^\d$/.test(key) ? { type: "newExpense", digit: key } : null;
}

const NON_TEXT_INPUTS = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "range",
  "color",
  "file",
  "image",
]);

export function acceptsTyping(tagName: string, type: string): boolean {
  if (tagName === "TEXTAREA" || tagName === "SELECT") return true;
  return tagName === "INPUT" && !NON_TEXT_INPUTS.has(type);
}

export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const type = target instanceof HTMLInputElement ? target.type : "";
  return target.isContentEditable || acceptsTyping(target.tagName, type);
}
