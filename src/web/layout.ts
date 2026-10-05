const SIDE_PADDING = 88;
const SIDE_COLUMN = 388;

export function heroSize(width: number): number {
  return Math.max(
    60,
    Math.min(172, (width - SIDE_PADDING - SIDE_COLUMN) / 6.6),
  );
}
