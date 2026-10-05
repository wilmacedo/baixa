import { describe, expect, it } from "vitest";
import { heroSize } from "./layout";

describe("heroSize", () => {
  it("grows with the viewport width", () => {
    expect(heroSize(1440)).toBeGreaterThan(heroSize(1180));
  });

  it("stays within its limits", () => {
    expect(heroSize(760)).toBe(60);
    expect(heroSize(3000)).toBe(172);
  });

  it("matches the reference at 1440 px", () => {
    expect(heroSize(1440)).toBeCloseTo((1440 - 88 - 388) / 6.6, 5);
  });
});
