import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 760;

export const modeFor = (width: number) =>
  width < MOBILE_BREAKPOINT ? "mobile" : "desktop";

export function useViewport() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return { width, mode: modeFor(width) };
}
