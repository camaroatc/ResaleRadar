/**
 * Monetary values are stored and calculated as integer cents.
 * Formatting for display lives in the UI layer only.
 */

export function isValidCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Round half up, away from zero for negatives. */
export function roundCents(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Parse a user supplied dollar amount ("12", "12.5", "$1,299.99") into cents. */
export function dollarsToCents(input: string | number): number | null {
  const raw = typeof input === 'number' ? String(input) : input.trim().replace(/[$,\s]/g, '');
  if (raw === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  return roundCents(Number(raw) * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatCents(cents: number, locale = 'en-US', currency = 'USD'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(centsToDollars(cents));
}
