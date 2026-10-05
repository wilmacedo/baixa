import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "./new-id";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe("newId", () => {
  it("returns a v4 uuid", () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it("falls back to getRandomValues when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(0xab),
    });

    expect(newId()).toMatch(UUID_V4);
  });

  it("returns a different id each time", () => {
    expect(newId()).not.toBe(newId());
  });
});
