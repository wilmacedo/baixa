import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { addMonths, type MonthKey } from "../shared/months";

export const FIRST_MONTH: MonthKey = "2024-01";

const LEAVE_MS = 150;
const SLIDE_PX = 28;

export type SlidePhase = "idle" | "leaving" | "entering";

export function slideStyle(
  phase: SlidePhase,
  direction: number,
): CSSProperties {
  switch (phase) {
    case "leaving":
      return {
        opacity: 0,
        transform: `translateX(${-direction * SLIDE_PX}px)`,
        transition: "opacity 140ms ease-in, transform 150ms ease-in",
      };
    case "entering":
      return {
        opacity: 0,
        transform: `translateX(${direction * SLIDE_PX}px)`,
        transition: "none",
      };
    case "idle":
      return {
        opacity: 1,
        transform: "none",
        transition:
          "opacity 260ms ease-out, transform 420ms cubic-bezier(0.2, 0.75, 0.2, 1)",
      };
  }
}

const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useMonthNavigation(currentMonth: MonthKey) {
  const [month, setMonth] = useState(currentMonth);
  const [phase, setPhase] = useState<SlidePhase>("idle");
  const [direction, setDirection] = useState(1);
  const target = useRef(currentMonth);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const goTo = useCallback((next: MonthKey) => {
    if (next < FIRST_MONTH || next === target.current) return;

    setDirection(next > target.current ? 1 : -1);
    target.current = next;
    window.clearTimeout(timer.current);

    if (prefersReducedMotion()) {
      setMonth(next);
      return;
    }

    setPhase("leaving");
    timer.current = window.setTimeout(() => {
      setMonth(next);
      setPhase("entering");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setPhase("idle")),
      );
    }, LEAVE_MS);
  }, []);

  const goBy = useCallback(
    (count: number) => goTo(addMonths(target.current, count)),
    [goTo],
  );

  const goToCurrent = useCallback(
    () => goTo(currentMonth),
    [goTo, currentMonth],
  );

  return {
    month,
    style: slideStyle(phase, direction),
    canGoBack: month > FIRST_MONTH,
    goTo,
    goBy,
    goToCurrent,
  };
}
