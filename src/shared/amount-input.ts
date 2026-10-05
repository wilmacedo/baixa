const MAX_WHOLE_DIGITS = 8;
const MAX_PASTE_LENGTH = 11;

export function typeKey(raw: string, key: string): string {
  if (key === "Backspace") return raw.slice(0, -1);

  if (key === "," || key === ".") {
    return raw.includes(",") ? raw : `${raw || "0"},`;
  }

  if (!/^\d$/.test(key)) return raw;

  const [whole = "", fraction] = raw.split(",");
  if (fraction !== undefined) {
    return fraction.length >= 2 ? raw : raw + key;
  }
  if (whole.replace(/^0+/, "").length >= MAX_WHOLE_DIGITS) return raw;
  return (raw === "0" ? "" : raw) + key;
}

export function pasteText(text: string): string {
  let cleaned = text.replace(/[^\d,.]/g, "");
  const lastSeparator = Math.max(
    cleaned.lastIndexOf(","),
    cleaned.lastIndexOf("."),
  );
  const decimals = cleaned.length - lastSeparator - 1;

  if (lastSeparator >= 0 && decimals <= 2) {
    const whole = cleaned.slice(0, lastSeparator).replace(/[,.]/g, "");
    cleaned = `${whole},${cleaned.slice(lastSeparator + 1)}`;
  } else {
    cleaned = cleaned.replace(/[,.]/g, "");
  }
  return cleaned.slice(0, MAX_PASTE_LENGTH);
}

export function displayRaw(raw: string): string {
  if (!raw) return "";
  const [whole = "", fraction] = raw.split(",");
  const digits = (whole || "0").replace(/^0+(?=\d)/, "");
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
}

export function ghostCents(raw: string): string {
  const fraction = raw.split(",")[1];
  if (fraction === undefined) return ",00";
  return "00".slice(fraction.length);
}
