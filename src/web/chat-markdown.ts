export interface Inline {
  text: string;
  bold?: boolean;
  code?: boolean;
}

export type Block =
  | { type: "paragraph"; inline: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] };

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/;

export function parseInline(text: string): Inline[] {
  return text
    .split(TOKEN)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return { text: part.slice(2, -2), bold: true };
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return { text: part.slice(1, -1), code: true };
      }
      return { text: part };
    });
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        inline: parseInline(paragraph.join(" ")),
      });
      paragraph = [];
    }
  };

  for (const line of text.split("\n")) {
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    const match = bullet ?? numbered;

    if (match) {
      flush();
      const ordered = numbered !== null && bullet === null;
      const last = blocks.at(-1);
      const item = parseInline((match[1] as string).trim());
      if (last?.type === "list" && last.ordered === ordered)
        last.items.push(item);
      else blocks.push({ type: "list", ordered, items: [item] });
    } else if (line.trim() === "") {
      flush();
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}
