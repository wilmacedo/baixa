import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const inPublic = (path: string) =>
  join(root, "public", path.replace(/^\//, ""));

describe("app icons", () => {
  const manifest = JSON.parse(
    readFileSync(inPublic("manifest.webmanifest"), "utf8"),
  ) as { icons: { src: string; sizes: string }[] };
  const html = readFileSync(join(root, "index.html"), "utf8");

  it("ships every icon the manifest lists", () => {
    for (const icon of manifest.icons) {
      expect(existsSync(inPublic(icon.src)), icon.src).toBe(true);
    }
  });

  it("links the favicon, the touch icon and the manifest from the page", () => {
    for (const href of [
      "/favicon.svg",
      "/favicon.ico",
      "/apple-touch-icon.png",
      "/manifest.webmanifest",
    ]) {
      expect(html).toContain(`href="${href}"`);
      expect(existsSync(inPublic(href)), href).toBe(true);
    }
  });
});
