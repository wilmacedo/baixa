import { useCallback, useEffect, useRef, useState } from "react";

const PLAIN_MS = 2600;
const UNDOABLE_MS = 5200;

export interface Toast {
  id: number;
  text: string;
  undoable: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = useCallback((text: string, undoable: boolean) => {
    window.clearTimeout(timer.current);
    counter.current += 1;
    setToast({ id: counter.current, text, undoable });
    timer.current = window.setTimeout(
      () => setToast(null),
      undoable ? UNDOABLE_MS : PLAIN_MS,
    );
  }, []);

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  return { toast, show, hide };
}
