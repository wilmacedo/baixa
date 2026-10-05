import { Fragment } from "react";
import { type Inline, parseBlocks } from "../chat-markdown";

function renderInline(parts: Inline[]) {
  return parts.map((part, index) => {
    const key = `${index}-${part.text}`;
    if (part.bold) return <strong key={key}>{part.text}</strong>;
    if (part.code) return <code key={key}>{part.text}</code>;
    return <Fragment key={key}>{part.text}</Fragment>;
  });
}

export function ChatMarkdown({ text }: { text: string }) {
  return parseBlocks(text).map((block, index) => {
    const key = `${index}-${block.type}`;
    if (block.type === "paragraph") {
      return <p key={key}>{renderInline(block.inline)}</p>;
    }
    const List = block.ordered ? "ol" : "ul";
    return (
      <List key={key}>
        {block.items.map((item, itemIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the items of a finished block never reorder
          <li key={itemIndex}>{renderInline(item)}</li>
        ))}
      </List>
    );
  });
}
