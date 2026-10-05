import { describe, expect, it } from "vitest";
import { slideStyle } from "./use-month-navigation";

describe("slideStyle", () => {
  it("is fully visible and animated when idle", () => {
    expect(slideStyle("idle", 1)).toMatchObject({
      opacity: 1,
      transform: "none",
    });
  });

  it("leaves towards the side opposite to the direction", () => {
    expect(slideStyle("leaving", 1)).toMatchObject({
      opacity: 0,
      transform: "translateX(-28px)",
    });
    expect(slideStyle("leaving", -1)).toMatchObject({
      transform: "translateX(28px)",
    });
  });

  it("enters from the side of the direction without transition", () => {
    expect(slideStyle("entering", 1)).toMatchObject({
      opacity: 0,
      transform: "translateX(28px)",
      transition: "none",
    });
  });
});
