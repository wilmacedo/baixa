export type GlobalAction =
  | { type: "theme" | "help" | "month" | "recurring" | "undo" }
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

export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}
