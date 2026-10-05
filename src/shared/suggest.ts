import { type CategorizedExpense, normalizeText } from "./category";

export const BUILT_IN_DESCRIPTIONS = [
  "Mercado",
  "Farmácia",
  "Padaria",
  "Uber",
  "Gasolina",
  "Restaurante",
  "Cinema",
  "iFood",
  "Estacionamento",
  "Café",
  "Drogaria",
  "Lanche",
];

export function suggestCompletion(
  text: string,
  history: readonly CategorizedExpense[],
  builtIn: readonly string[] = BUILT_IN_DESCRIPTIONS,
): string {
  const typed = normalizeText(text);
  if (!typed) return "";

  const seen = new Set<string>();
  const pool: string[] = [];
  for (const description of [
    ...history.map((entry) => entry.description).reverse(),
    ...builtIn,
  ]) {
    const key = normalizeText(description);
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(description);
  }

  const match = pool.find(
    (candidate) =>
      normalizeText(candidate).startsWith(typed) &&
      candidate.length > text.length,
  );
  return match ? match.slice(text.length) : "";
}
