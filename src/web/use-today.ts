import { useEffect, useState } from "react";
import { type Today, todayOf } from "../shared/months";

const REFRESH_MS = 60_000;

export function useToday(): Today {
  const [today, setToday] = useState(() => todayOf(new Date()));

  useEffect(() => {
    const refresh = () =>
      setToday((previous) => {
        const next = todayOf(new Date());
        return next.month === previous.month && next.day === previous.day
          ? previous
          : next;
      });

    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
  }, []);

  return today;
}
