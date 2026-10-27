/**
 * @jest-environment node
 */
import { randomUUID } from 'node:crypto';
import { jarEntries } from '@/db/schema';
import { openTestDb } from '@/db/testing';
import { adjustBalance, currentBalance, saveProfile } from '@/features/profile/repo';
import { addToJar, closeJar, createJar, jarSaved, openJarsQuery } from '../repo';
import {
  jarPace,
  jarPercent,
  monthsBetween,
  monthsTaken,
  quickAmounts,
  savedByJar,
} from '../savings';

const id = randomUUID;
// New laptop on the Savings board: ₾3,000 at ₾300 a month.
const laptop = { goalMinor: 300000, monthlyMinor: 30000, startDate: '2026-04-27' };

describe('jarPercent', () => {
  it('rounds and stays within 0–100', () => {
    expect(jarPercent(186000, 300000)).toBe(62);
    expect(jarPercent(64000, 200000)).toBe(32);
    expect(jarPercent(400000, 300000)).toBe(100);
    expect(jarPercent(-100, 300000)).toBe(0);
  });
});

describe('monthsBetween', () => {
  it('counts whole months', () => {
    expect(monthsBetween('2026-10-27', '2026-11-26')).toBe(0);
    expect(monthsBetween('2026-10-27', '2026-11-27')).toBe(1);
    expect(monthsBetween('2026-01-31', '2027-01-30')).toBe(11);
  });
});

describe('jarPace', () => {
  it('says when the jar will be full at the monthly amount', () => {
    // 4 months of saving: ₾1,860 → ₾3,000 is ready by February.
    expect(jarPace(laptop, 186000, '2026-10-27')).toEqual({
      type: 'readyBy',
      year: 2027,
      month: 2,
    });
  });

  it('is a month ahead once a whole month past the plan', () => {
    // Plan: 6 months × ₾300 = ₾1,800; ₾2,100 is a month ahead.
    expect(jarPace(laptop, 210000, '2026-10-27')).toEqual({ type: 'ahead' });
    expect(jarPace(laptop, 209999, '2026-10-27').type).toBe('readyBy');
  });

  it('is full at the goal', () => {
    expect(jarPace(laptop, 300000, '2026-10-27')).toEqual({ type: 'full' });
  });
});

describe('quickAmounts', () => {
  it('is ₾50, ₾100, ₾200 and the usual monthly amount', () => {
    expect(quickAmounts(30000)).toEqual([
      { minor: 5000, usual: false },
      { minor: 10000, usual: false },
      { minor: 20000, usual: false },
      { minor: 30000, usual: true },
    ]);
  });

  it('marks a chip as usual instead of repeating it', () => {
    expect(quickAmounts(10000).map((c) => c.minor)).toEqual([5000, 10000, 20000]);
  });
});

describe('monthsTaken', () => {
  it('is at least one', () => {
    expect(monthsTaken('2026-01-27', '2026-10-27')).toBe(9);
    expect(monthsTaken('2026-10-01', '2026-10-27')).toBe(1);
  });
});

describe('jars in the database', () => {
  function withBalance() {
    const db = openTestDb();
    saveProfile(db, { name: 'Nika', currency: 'GEL', payday: 5 }, id);
    adjustBalance(db, 1000000, '2026-10-01', id);
    return db;
  }

  it('takes jar money off the balance and gives it back when the jar closes', () => {
    const db = withBalance();
    const jar = createJar(
      db,
      { name: 'New laptop', tone: 'gold', goalMinor: 300000, monthlyMinor: 30000 },
      '2026-10-27',
      id,
    );
    addToJar(db, jar, 10000, '2026-10-27', id);
    addToJar(db, jar, 5000, '2026-10-28', id);

    expect(jarSaved(db, jar)).toBe(15000);
    expect(currentBalance(db)).toBe(985000);
    expect(savedByJar(db.select().from(jarEntries).all())).toEqual(new Map([[jar, 15000]]));

    closeJar(db, jar, '2026-10-29', id);
    expect(jarSaved(db, jar)).toBe(0);
    expect(currentBalance(db)).toBe(1000000);
    expect(openJarsQuery(db).all()).toEqual([]);
  });

  it('keeps the typed balance when the balance is changed with money in a jar', () => {
    const db = withBalance();
    const jar = createJar(
      db,
      { name: 'Rainy day', tone: 'sky', goalMinor: 200000, monthlyMinor: 20000 },
      '2026-10-27',
      id,
    );
    addToJar(db, jar, 64000, '2026-10-27', id);
    adjustBalance(db, 1248050, '2026-10-27', id);
    expect(currentBalance(db)).toBe(1248050);
  });

  it('refuses an empty name or a zero amount', () => {
    const db = withBalance();
    const input = { name: ' ', tone: 'sage' as const, goalMinor: 150000, monthlyMinor: 25000 };
    expect(() => createJar(db, input, '2026-10-27', id)).toThrow();
    const jar = createJar(db, { ...input, name: 'New bike' }, '2026-10-27', id);
    expect(() => addToJar(db, jar, 0, '2026-10-27', id)).toThrow(RangeError);
  });
});
