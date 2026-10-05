import { describe, expect, it } from "vitest";
import { releaseSettled } from "./use-settling";

const settling = { rent: "fixed", gym: "charges", card: "cards" } as const;

describe("releaseSettled", () => {
  it("releases a whole group when the mouse leaves it", () => {
    expect(releaseSettled(settling, { group: "fixed", hovered: null })).toEqual(
      {
        gym: "charges",
        card: "cards",
      },
    );
  });

  it("keeps the rows of the hovered group when the timer fires", () => {
    expect(releaseSettled(settling, { hovered: "charges" })).toEqual({
      gym: "charges",
    });
  });

  it("releases everything when nothing is hovered", () => {
    expect(releaseSettled(settling, { hovered: null })).toEqual({});
  });
});
