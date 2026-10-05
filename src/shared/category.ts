import type { Category } from "./types";

const KEYWORDS: ReadonlyArray<readonly [Category, readonly string[]]> = [
  [
    "groceries",
    [
      "mercado",
      "supermerc",
      "padaria",
      "feira",
      "hortifruti",
      "acougue",
      "atacad",
      "sacolao",
    ],
  ],
  [
    "health",
    [
      "farm",
      "drogaria",
      "medic",
      "consulta",
      "exame",
      "dentista",
      "remedio",
      "hospital",
    ],
  ],
  [
    "transport",
    [
      "uber",
      "99",
      "taxi",
      "gasolina",
      "combust",
      "posto",
      "estacion",
      "pedagio",
      "onibus",
      "metro",
      "oficina",
    ],
  ],
  [
    "leisure",
    [
      "cinema",
      "bar",
      "restaurante",
      "ifood",
      "show",
      "livro",
      "teatro",
      "jogo",
      "viagem",
      "cafe",
      "pizza",
      "lanche",
    ],
  ],
  [
    "home",
    [
      "casa",
      "limpeza",
      "lampada",
      "ferrament",
      "move",
      "reforma",
      "leroy",
      "gas",
    ],
  ],
];

export interface CategorizedExpense {
  description: string;
  category: Category;
}

export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function detectCategory(
  description: string,
  history: readonly CategorizedExpense[] = [],
): Category | null {
  const text = normalizeText(description);
  if (!text) return null;

  const known = history.findLast((e) => normalizeText(e.description) === text);
  if (known) return known.category;

  const words = text.split(/\s+/);
  for (const [category, keywords] of KEYWORDS) {
    if (words.some((word) => keywords.some((k) => word.startsWith(k)))) {
      return category;
    }
  }
  return null;
}
