import { describe, expect, it } from "vitest";
import { modeFor } from "./use-viewport";

describe("modeFor", () => {
  it("switches to mobile below 760 px", () => {
    expect(modeFor(390)).toBe("mobile");
    expect(modeFor(759)).toBe("mobile");
  });

  it("uses desktop from 760 px up", () => {
    expect(modeFor(760)).toBe("desktop");
    expect(modeFor(1440)).toBe("desktop");
  });
});
