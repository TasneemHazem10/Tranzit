/**
 * Safely format a number for display, falling back to a plain locale-less
 * format when the runtime lacks the requested ICU locale (e.g. Hermes without
 * bundled `ar-EG` data), which would otherwise throw and crash the screen.
 */
export function formatNumber(value: number, locale?: string): string {
  const loc = locale ?? 'en-US';
  try {
    return value.toLocaleString(loc);
  } catch {
    try {
      return value.toLocaleString('en-US');
    } catch {
      return String(value);
    }
  }
}

/** Format a currency-like number with the given locale. */
export function formatCurrency(value: number, currency = 'ج.م', locale?: string): string {
  return `${formatNumber(value, locale)} ${currency}`;
}
