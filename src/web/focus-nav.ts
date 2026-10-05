export function moveFocus(
  columns: readonly (readonly string[])[],
  current: string | null,
  delta: number,
): string | null {
  const flat = columns.flat();
  if (flat.length === 0) return null;

  const index = current === null ? -1 : flat.indexOf(current);
  if (index < 0) return flat[delta > 0 ? 0 : flat.length - 1] ?? null;

  const next = Math.max(0, Math.min(flat.length - 1, index + delta));
  return flat[next] ?? null;
}

export function moveColumn(
  columns: readonly (readonly string[])[],
  current: string | null,
  delta: number,
): string | null {
  const filled = columns.filter((column) => column.length > 0);
  if (filled.length === 0) return null;

  const columnIndex = filled.findIndex(
    (column) => current !== null && column.includes(current),
  );
  if (columnIndex < 0) return filled[0]?.[0] ?? null;

  const rowIndex = filled[columnIndex]?.indexOf(current as string) ?? 0;
  const target = Math.max(0, Math.min(filled.length - 1, columnIndex + delta));
  const column = filled[target] ?? [];
  return column[Math.min(rowIndex, column.length - 1)] ?? null;
}
