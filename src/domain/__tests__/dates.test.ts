import {
  addDays,
  daysInMonth,
  daysLeft,
  diffDays,
  isInPeriod,
  monthlyDate,
  monthlyDatesInPeriod,
  payPeriod,
  toCalendarDate,
} from '../dates';

describe('payPeriod', () => {
  it('runs from payday to the next payday (docs/sample-data.md)', () => {
    const period = payPeriod('2026-10-31', 5);
    expect(period).toEqual({ start: '2026-10-05', end: '2026-11-05', days: 31 });
    expect(daysLeft('2026-10-31', period)).toBe(5);
  });

  it('starts today when today is payday', () => {
    expect(payPeriod('2026-10-05', 5).start).toBe('2026-10-05');
  });

  it('belongs to last month before this month’s payday', () => {
    expect(payPeriod('2026-10-04', 5)).toEqual({
      start: '2026-09-05',
      end: '2026-10-05',
      days: 30,
    });
  });

  it('crosses the new year', () => {
    expect(payPeriod('2027-01-03', 25)).toEqual({
      start: '2026-12-25',
      end: '2027-01-25',
      days: 31,
    });
  });

  describe('payday 31', () => {
    it('lands on Feb 28 in February', () => {
      expect(payPeriod('2027-02-10', 31)).toEqual({
        start: '2027-01-31',
        end: '2027-02-28',
        days: 28,
      });
      expect(payPeriod('2027-02-28', 31)).toEqual({
        start: '2027-02-28',
        end: '2027-03-31',
        days: 31,
      });
    });

    it('lands on Feb 29 in a leap year', () => {
      expect(payPeriod('2028-02-29', 31).start).toBe('2028-02-29');
    });

    it('lands on the 30th in a 30-day month', () => {
      expect(payPeriod('2026-11-30', 31)).toEqual({
        start: '2026-11-30',
        end: '2026-12-31',
        days: 31,
      });
      expect(payPeriod('2026-11-29', 31)).toEqual({
        start: '2026-10-31',
        end: '2026-11-30',
        days: 30,
      });
    });
  });

  it('rejects a payday outside 1–31', () => {
    expect(() => payPeriod('2026-10-31', 0)).toThrow(RangeError);
    expect(() => payPeriod('2026-10-31', 32)).toThrow(RangeError);
  });
});

describe('day arithmetic', () => {
  it('knows month lengths', () => {
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 11)).toBe(30);
    expect(monthlyDate(2027, 2, 31)).toBe('2027-02-28');
  });

  it('adds and diffs days across months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(diffDays('2026-10-05', '2026-11-05')).toBe(31);
    expect(diffDays('2026-11-05', '2026-10-05')).toBe(-31);
  });

  it('treats the end of a period as exclusive', () => {
    const period = payPeriod('2026-10-31', 5);
    expect(isInPeriod('2026-10-05', period)).toBe(true);
    expect(isInPeriod('2026-11-04', period)).toBe(true);
    expect(isInPeriod('2026-11-05', period)).toBe(false);
    expect(isInPeriod('2026-10-04', period)).toBe(false);
  });

  it('turns a local moment into its calendar date', () => {
    expect(toCalendarDate(new Date(2026, 9, 31, 23, 59))).toBe('2026-10-31');
  });

  it('rejects malformed dates', () => {
    expect(() => diffDays('31/10/2026', '2026-11-05')).toThrow(RangeError);
  });
});

describe('monthlyDatesInPeriod', () => {
  it('finds the one date a monthly bill falls on', () => {
    const period = payPeriod('2026-10-31', 5);
    expect(monthlyDatesInPeriod(10, period)).toEqual(['2026-10-10']);
    expect(monthlyDatesInPeriod(1, period)).toEqual(['2026-11-01']);
    expect(monthlyDatesInPeriod(5, period)).toEqual(['2026-10-05']);
  });
});
