import { currencies, formatMoney, parseAmount, percent, perDay, type CurrencyCode } from '../money';

const MINUS = '−';

describe('parseAmount', () => {
  it.each([
    ['24.50', 2450],
    ['24.5', 2450],
    ['24', 2400],
    ['0.05', 5],
    ['1,234.50', 123450],
    ['24.', 2400], // the keypad's state right after tapping "."
    ['.5', 50],
    ['  12.30  ', 1230],
    ['0', 0],
  ])('parses %j to %i tetri', (text, minor) => {
    expect(parseAmount(text, 'GEL')).toBe(minor);
  });

  it('never goes through floats', () => {
    // As a float, 1.005 * 100 is 100.49999999999999. Lari has 2 decimals, so
    // a third one is rejected instead of rounding to 100 or 101.
    expect(parseAmount('1.005', 'GEL')).toBeNull();
    // Values that are inexact as floats still come out exact.
    expect(parseAmount('0.29', 'GEL')).toBe(29);
    expect(parseAmount('4.35', 'GEL')).toBe(435);
    expect(parseAmount('9,007,199,254,740.99', 'GEL')).toBe(900719925474099);
  });

  it.each(['', '.', 'abc', '1.2.3', '-5', '1,23.00', '12,34', '1 000', '₾5'])(
    'rejects %j',
    (text) => {
      expect(parseAmount(text, 'GEL')).toBeNull();
    },
  );

  it('rejects amounts beyond the safe integer range', () => {
    expect(parseAmount('99999999999999999', 'GEL')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('always shows two decimals by default (transactions, Left to spend)', () => {
    expect(formatMoney(7000, 'GEL')).toBe('₾70.00');
    expect(formatMoney(79970, 'GEL')).toBe('₾799.70');
    expect(formatMoney(5, 'GEL')).toBe('₾0.05');
    expect(formatMoney(0, 'GEL')).toBe('₾0.00');
  });

  it('drops .00 only when whole with decimals: auto (totals, limits, chips)', () => {
    expect(formatMoney(80000, 'GEL', { decimals: 'auto' })).toBe('₾800');
    expect(formatMoney(8760, 'GEL', { decimals: 'auto' })).toBe('₾87.60');
    expect(formatMoney(81240, 'GEL', { decimals: 'auto' })).toBe('₾812.40');
  });

  it('shows whole units only with decimals: none', () => {
    expect(formatMoney(8500, 'GEL', { decimals: 'none' })).toBe('₾85');
  });

  it('groups thousands with commas', () => {
    expect(formatMoney(1248050, 'GEL')).toBe('₾12,480.50');
    expect(formatMoney(380000, 'GEL', { decimals: 'auto' })).toBe('₾3,800');
    expect(formatMoney(123456789012, 'GEL')).toBe('₾1,234,567,890.12');
  });

  it('puts a real minus or a plus before the symbol', () => {
    expect(formatMoney(1150, 'GEL', { sign: 'expense' })).toBe(`${MINUS}₾11.50`);
    expect(formatMoney(380000, 'GEL', { sign: 'income' })).toBe('+₾3,800.00');
    expect(formatMoney(-2500, 'GEL')).toBe(`${MINUS}₾25.00`);
    expect(formatMoney(2500, 'GEL')).toBe('₾25.00');
  });

  it('uses each currency symbol', () => {
    expect(formatMoney(1999, 'USD')).toBe('$19.99');
    expect(formatMoney(1999, 'EUR')).toBe('€19.99');
    expect(formatMoney(1999, 'UAH')).toBe('₴19.99');
  });

  it('refuses non-integer amounts', () => {
    expect(() => formatMoney(12.5, 'GEL')).toThrow(RangeError);
  });
});

describe('perDay', () => {
  it('rounds down to whole units so it never suggests more than you have', () => {
    // docs/sample-data.md: ₾2,650 over 31 days is ₾85.48 a day, shown as ₾85.
    expect(perDay(265000, 31, 'GEL')).toBe(8500);
    expect(perDay(9999, 1, 'GEL')).toBe(9900);
    expect(perDay(1000, 3, 'GEL')).toBe(300);
  });

  it('needs at least one whole day', () => {
    expect(() => perDay(1000, 0, 'GEL')).toThrow(RangeError);
    expect(() => perDay(1000, 1.5, 'GEL')).toThrow(RangeError);
  });
});

describe('percent', () => {
  it('rounds to the nearest whole percent', () => {
    // docs/sample-data.md: ₾1,850.30 of ₾2,650 is 69.8% → 70% spent.
    expect(percent(185030, 265000)).toBe(70);
    expect(percent(81240, 300030)).toBe(27);
    expect(percent(1, 3)).toBe(33);
  });

  it('is 0 when the whole is 0', () => {
    expect(percent(500, 0)).toBe(0);
  });
});

describe('currencies', () => {
  it('has 2 minor units for every v1 currency (ISO 4217)', () => {
    const codes = Object.keys(currencies) as CurrencyCode[];
    expect(codes).toEqual(['GEL', 'USD', 'EUR', 'GBP', 'TRY', 'AMD', 'AZN', 'UAH']);
    for (const code of codes) expect(currencies[code].minorUnits).toBe(2);
  });
});
