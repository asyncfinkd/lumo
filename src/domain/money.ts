// Money as integer minor units (tetri, cents). See docs/adr/0003-money-as-minor-units.md.
// Pure functions only: no React, no database.

export type CurrencyCode = 'GEL' | 'USD' | 'EUR' | 'GBP' | 'TRY' | 'AMD' | 'AZN' | 'UAH';

type Currency = {
  name: string;
  symbol: string;
  /** ISO 4217 exponent: how many decimal digits the currency has. */
  minorUnits: number;
};

export const currencies: Record<CurrencyCode, Currency> = {
  GEL: { name: 'Georgian lari', symbol: '₾', minorUnits: 2 },
  USD: { name: 'US dollar', symbol: '$', minorUnits: 2 },
  EUR: { name: 'Euro', symbol: '€', minorUnits: 2 },
  GBP: { name: 'British pound', symbol: '£', minorUnits: 2 },
  TRY: { name: 'Turkish lira', symbol: '₺', minorUnits: 2 },
  AMD: { name: 'Armenian dram', symbol: '֏', minorUnits: 2 },
  AZN: { name: 'Azerbaijani manat', symbol: '₼', minorUnits: 2 },
  UAH: { name: 'Ukrainian hryvnia', symbol: '₴', minorUnits: 2 },
};

const MINUS = '−'; // a real minus sign, not a hyphen

const grouping = new Intl.NumberFormat('en-US', { useGrouping: true, maximumFractionDigits: 0 });

function assertMinor(minor: number) {
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError(`Money must be a safe integer of minor units, got ${minor}`);
  }
}

/**
 * Parses typed text ("24.50", "1,234.5", "24.") into minor units without ever
 * going through a float. Returns null for anything that isn't a valid amount,
 * including more decimals than the currency has ("1.005" in lari).
 */
export function parseAmount(text: string, currency: CurrencyCode): number | null {
  const { minorUnits } = currencies[currency];
  const trimmed = text.trim();

  // Plain digits, or digits grouped by commas in threes; then an optional fraction.
  const match = /^(\d+|\d{1,3}(?:,\d{3})+)?(?:\.(\d*))?$/.exec(trimmed);
  if (!match || trimmed === '' || trimmed === '.') return null;

  const whole = (match[1] ?? '0').replace(/,/g, '');
  const fraction = match[2] ?? '';
  if (fraction.length > minorUnits) return null;

  const minor = Number(whole) * 10 ** minorUnits + Number(fraction.padEnd(minorUnits, '0') || '0');
  return Number.isSafeInteger(minor) ? minor : null;
}

type FormatOptions = {
  /**
   * `always`: transactions and Left to spend (₾70.00).
   * `auto`: totals, limits and chips drop ".00" when whole (₾800, ₾87.60).
   * `none`: whole units only, for rounded figures like "about ₾85 a day".
   */
  decimals?: 'always' | 'auto' | 'none';
  /**
   * `auto`: a minus only when negative.
   * `expense` / `income`: always show − or + (transaction rows).
   */
  sign?: 'auto' | 'expense' | 'income';
};

/** Formats minor units as "₾1,234.50", the v1 style for every locale. */
export function formatMoney(
  minor: number,
  currency: CurrencyCode,
  { decimals = 'always', sign = 'auto' }: FormatOptions = {},
): string {
  assertMinor(minor);
  const { symbol, minorUnits } = currencies[currency];
  const scale = 10 ** minorUnits;
  const abs = Math.abs(minor);

  const whole = Math.floor(abs / scale);
  const fraction = abs % scale;
  const showFraction =
    minorUnits > 0 && (decimals === 'always' || (decimals === 'auto' && fraction !== 0));
  const digits =
    grouping.format(whole) + (showFraction ? '.' + String(fraction).padStart(minorUnits, '0') : '');

  const prefix = sign === 'expense' ? MINUS : sign === 'income' ? '+' : minor < 0 ? MINUS : '';
  return prefix + symbol + digits;
}

/**
 * Spread an amount over the days left, rounded down to whole currency units so
 * the app never suggests more than you have: ₾2,650.00 over 31 days → ₾85.
 */
export function perDay(minor: number, days: number, currency: CurrencyCode): number {
  assertMinor(minor);
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`days must be a whole number of at least 1, got ${days}`);
  }
  const scale = 10 ** currencies[currency].minorUnits;
  return Math.floor(minor / days / scale) * scale;
}

/** Share of `whole` as a whole percent, rounded to nearest (70% spent). 0 when whole is 0. */
export function percent(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part * 100) / whole);
}
