export interface FlightSource {
  rect: DOMRect;
  text: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
}

const DURATION_MS = 640;

export function captureFlight(
  element: HTMLElement,
  text: string,
): FlightSource {
  const style = getComputedStyle(element);
  return {
    rect: element.getBoundingClientRect(),
    text,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
  };
}

export function flyValue(source: FlightSource, target: HTMLElement) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ghost = document.createElement("div");
  ghost.textContent = source.text;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${source.rect.left}px`,
    top: `${source.rect.top}px`,
    fontFamily: source.fontFamily,
    fontSize: source.fontSize,
    lineHeight: source.lineHeight,
    letterSpacing: source.letterSpacing,
    fontVariationSettings: '"wght" 780, "wdth" 104',
    fontVariantNumeric: "tabular-nums",
    color: "var(--ink)",
    transformOrigin: "0 0",
    zIndex: "60",
    pointerEvents: "none",
    whiteSpace: "nowrap",
  });
  document.body.appendChild(ghost);

  const from = ghost.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const scale = to.width / from.width;
  const dx = to.left - from.left;
  const dy = to.top + to.height / 2 - (from.top + (from.height * scale) / 2);

  target.style.opacity = "0";
  const animation = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1)" },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
    ],
    { duration: DURATION_MS, easing: "cubic-bezier(0.65, 0, 0.2, 1)" },
  );

  const finish = () => {
    ghost.remove();
    target.style.opacity = "";
  };
  animation.onfinish = finish;
  animation.oncancel = finish;
}
