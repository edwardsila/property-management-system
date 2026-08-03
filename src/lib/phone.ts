const KENYAN_MOBILE_PATTERN = /^254[17][0-9]{8}$/;

export function parseKenyanPhone(input: string) {
  const digits = input.replace(/[\s().\-]/g, "").replace(/^\+/, "");

  if (!/^\d+$/.test(digits)) {
    return null;
  }

  if (digits.startsWith("254")) {
    const rest = digits.slice(3);

    if (rest.length === 9) {
      return `254${rest}`;
    }

    if (rest.length === 10 && rest.startsWith("0")) {
      return `254${rest.slice(1)}`;
    }

    return null;
  }

  if (digits.startsWith("0")) {
    const rest = digits.slice(1);

    return rest.length === 9 ? `254${rest}` : null;
  }

  return digits.length === 9 ? `254${digits}` : null;
}

export function isValidKenyanMobile(input: string) {
  const normalized = parseKenyanPhone(input);

  return normalized !== null && KENYAN_MOBILE_PATTERN.test(normalized);
}

export function formatKenyanPhone(input: string) {
  const normalized = parseKenyanPhone(input);

  if (!normalized) {
    return input.trim();
  }

  return `+${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;
}
