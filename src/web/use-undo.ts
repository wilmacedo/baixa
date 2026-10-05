import { useCallback, useRef } from "react";

type UndoAction = () => unknown;

export function useUndo() {
  const last = useRef<UndoAction | null>(null);

  const record = useCallback((action: UndoAction) => {
    last.current = action;
  }, []);

  const run = useCallback(async (): Promise<boolean> => {
    const action = last.current;
    if (!action) return false;
    last.current = null;
    await action();
    return true;
  }, []);

  return { record, run };
}
