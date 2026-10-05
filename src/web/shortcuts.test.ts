import { describe, expect, it } from "vitest";
import { acceptsTyping, globalShortcut } from "./shortcuts";

const press = (key: string, modifiers: Partial<KeyboardEvent> = {}) =>
  globalShortcut({
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    ...modifiers,
  });

describe("globalShortcut", () => {
  it.each([
    ["t", "theme"],
    ["T", "theme"],
    ["?", "help"],
    ["c", "chat"],
    ["m", "month"],
    ["r", "recurring"],
    ["z", "undo"],
  ])("maps %s to %s", (key, type) => {
    expect(press(key)).toEqual({ type });
  });

  it("opens a new expense with n, + or a digit", () => {
    expect(press("n")).toEqual({ type: "newExpense" });
    expect(press("+")).toEqual({ type: "newExpense" });
    expect(press("7")).toEqual({ type: "newExpense", digit: "7" });
  });

  it("undoes with a modifier too", () => {
    expect(press("z", { metaKey: true })).toEqual({ type: "undo" });
    expect(press("z", { ctrlKey: true })).toEqual({ type: "undo" });
  });

  it("ignores other modified keys", () => {
    expect(press("t", { metaKey: true })).toBeNull();
    expect(press("n", { altKey: true })).toBeNull();
  });

  it("ignores keys without a shortcut", () => {
    expect(press("q")).toBeNull();
    expect(press("Enter")).toBeNull();
    expect(press("ArrowDown")).toBeNull();
  });
});

describe("acceptsTyping", () => {
  it("is true for fields where letters are typed", () => {
    expect(acceptsTyping("INPUT", "text")).toBe(true);
    expect(acceptsTyping("INPUT", "search")).toBe(true);
    expect(acceptsTyping("TEXTAREA", "")).toBe(true);
    expect(acceptsTyping("SELECT", "")).toBe(true);
  });

  it("is false for checkboxes, buttons and other controls", () => {
    expect(acceptsTyping("INPUT", "checkbox")).toBe(false);
    expect(acceptsTyping("INPUT", "radio")).toBe(false);
    expect(acceptsTyping("INPUT", "submit")).toBe(false);
    expect(acceptsTyping("BUTTON", "")).toBe(false);
    expect(acceptsTyping("DIV", "")).toBe(false);
  });
});
