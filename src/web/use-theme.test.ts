import { describe, expect, it } from "vitest";
import { resolveTheme } from "./use-theme";

describe("resolveTheme", () => {
  it("prefers the stored choice over the system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the system preference when nothing is stored", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("ignores an unknown stored value", () => {
    expect(resolveTheme("sepia", true)).toBe("dark");
  });
});
