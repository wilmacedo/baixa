const groupThousands = (digits: string) =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  const sign = cents < 0 ? "-" : "";
  return `${sign}${groupThousands(String(whole))},${fraction}`;
}

export function toRaw(cents: number): string {
  return formatCents(cents).replaceAll(".", "");
}

export function parseRaw(raw: string): number {
  const [whole = "", fraction = ""] = raw.split(",");
  const wholeDigits = whole.replace(/\D/g, "") || "0";
  const fractionDigits = fraction.replace(/\D/g, "").slice(0, 2).padEnd(2, "0");
  return Number(wholeDigits) * 100 + Number(fractionDigits);
}
