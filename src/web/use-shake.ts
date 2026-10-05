import { useCallback, useEffect, useRef, useState } from "react";

const STEPS = [
  "translateX(-10px)",
  "translateX(8px)",
  "translateX(-5px)",
  "translateX(3px)",
  "none",
];
const STEP_MS = 70;

export function useShake() {
  const [transform, setTransform] = useState("none");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const shake = useCallback(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    window.clearTimeout(timer.current);
    let step = 0;
    const advance = () => {
      setTransform(STEPS[step] ?? "none");
      step += 1;
      if (step < STEPS.length) {
        timer.current = window.setTimeout(advance, STEP_MS);
      }
    };
    advance();
  }, []);

  return { transform, shake };
}
