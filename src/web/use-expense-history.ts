import { useCallback, useEffect, useState } from "react";
import type { CategorizedExpense } from "../shared/category";
import { api } from "./api";

export function useExpenseHistory() {
  const [history, setHistory] = useState<CategorizedExpense[]>([]);

  const refresh = useCallback(() => {
    api.expenseHistory().then(setHistory, () => {});
  }, []);

  useEffect(refresh, [refresh]);

  return { history, refresh };
}
