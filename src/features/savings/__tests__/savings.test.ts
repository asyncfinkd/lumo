/**
 * @jest-environment node
 */
import { randomUUID } from 'node:crypto';
import { jarEntries } from '@/db/schema';
import { formatTime, parseTime, planJarReminders } from '../reminders';
import { openTestDb } from '@/db/testing';
import { adjustBalance, currentBalance, saveProfile } from '@/features/profile/repo';
import { addToJar, closeJar, createJar, jarSaved, openJarsQuery, takeFromJar } from '../repo';
import {
  jarPace,
  jarPercent,
  monthsBetween,
  monthsTaken,
  quickAmounts,
  savedByJar,
  takeOutAmounts,
} from '../savings';

const id = randomUUID;
// New laptop on the Savings board: ₾3,000 at ₾300 a month.
const laptop = {
  goalMinor: 300000,
  planMinor: 30000,
  cadence: 'month' as const,
  startDate: '2026-04-27',
};

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
    expect(jarPace(laptop, 210000, '2026-10-27')).toEqual({ type: 'ahead', by: 'month' });
    expect(jarPace(laptop, 209999, '2026-10-27').type).toBe('readyBy');
  });

  it('is full at the goal', () => {
    expect(jarPace(laptop, 300000, '2026-10-27')).toEqual({ type: 'full' });
  });
});

describe('a daily jar', () => {
  // ₾5 a day toward ₾1,500, started Oct 1.
  const bike = {
    goalMinor: 150000,
    planMinor: 500,
    cadence: 'day' as const,
    startDate: '2026-10-01',
  };

  it('is ready when the days at ₾5 run out', () => {
    // ₾100 in, ₾1,400 to go: 280 days from Oct 27 is Aug 4, 2027.
    expect(jarPace(bike, 10000, '2026-10-27')).toEqual({ type: 'readyBy', year: 2027, month: 8 });
  });

  it('is a week ahead once seven days past the plan', () => {
    // Plan: 26 days × ₾5 = ₾130; a week ahead from ₾165.
    expect(jarPace(bike, 16500, '2026-10-27')).toEqual({ type: 'ahead', by: 'week' });
    expect(jarPace(bike, 16499, '2026-10-27').type).toBe('readyBy');
  });

  it('offers small amounts, the daily one as usual', () => {
    expect(quickAmounts(500, 'day')).toEqual([
      { minor: 500, usual: true },
      { minor: 1000, usual: false },
      { minor: 2000, usual: false },
      { minor: 5000, usual: false },
    ]);
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
      {
        name: 'New laptop',
        tone: 'gold',
        goalMinor: 300000,
        planMinor: 30000,
        cadence: 'month' as const,
        remindAt: null,
      },
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
      {
        name: 'Rainy day',
        tone: 'sky',
        goalMinor: 200000,
        planMinor: 20000,
        cadence: 'month' as const,
        remindAt: null,
      },
      '2026-10-27',
      id,
    );
    addToJar(db, jar, 64000, '2026-10-27', id);
    adjustBalance(db, 1248050, '2026-10-27', id);
    expect(currentBalance(db)).toBe(1248050);
  });

  it('refuses an empty name or a zero amount', () => {
    const db = withBalance();
    const input = {
      name: ' ',
      tone: 'sage' as const,
      goalMinor: 150000,
      planMinor: 25000,
      cadence: 'month' as const,
      remindAt: null,
    };
    expect(() => createJar(db, input, '2026-10-27', id)).toThrow();
    const jar = createJar(db, { ...input, name: 'New bike' }, '2026-10-27', id);
    expect(() => addToJar(db, jar, 0, '2026-10-27', id)).toThrow(RangeError);
  });
});

describe('takeOutAmounts', () => {
  it('offers amounts below what is in the jar, then all of it', () => {
    expect(takeOutAmounts(30000, 64000).map((c) => [c.minor, c.all])).toEqual([
      [5000, false],
      [10000, false],
      [20000, false],
      [64000, true],
    ]);
    expect(takeOutAmounts(30000, 3000)).toEqual([{ minor: 3000, usual: false, all: true }]);
    expect(takeOutAmounts(30000, 0)).toEqual([]);
  });

  it('never takes more than is in the jar', () => {
    const db = openTestDb();
    saveProfile(db, { name: 'Nika', currency: 'GEL', payday: 5 }, id);
    const input = {
      name: 'Rainy day',
      tone: 'sky' as const,
      goalMinor: 200000,
      planMinor: 20000,
      cadence: 'month' as const,
      remindAt: null,
    };
    const jar = createJar(db, input, '2026-10-27', id);
    addToJar(db, jar, 10000, '2026-10-27', id);
    takeFromJar(db, jar, 4000, '2026-10-28', id);
    expect(jarSaved(db, jar)).toBe(6000);
    expect(() => takeFromJar(db, jar, 6001, '2026-10-28', id)).toThrow(RangeError);
  });
});

describe('planJarReminders', () => {
  const words = {
    title: (name: string) => `${name} 🫙`,
    body: (amount: string, cadence: string) => `Drop ${amount} in the jar ${cadence}?`,
  };
  const money = (minor: number) => `₾${minor / 100}`;
  const jar = {
    id: 'bike',
    name: 'New bike',
    planMinor: 500,
    cadence: 'day' as const,
    startDate: '2026-10-31',
    remindAt: '22:00',
    closedAt: null,
  };

  it('reminds daily jars at their time, monthly ones on their day', () => {
    const laptop = { ...jar, id: 'laptop', cadence: 'month' as const, planMinor: 30000 };
    expect(planJarReminders([jar, laptop], true, money, words)).toEqual([
      {
        id: 'jar-bike',
        jarId: 'bike',
        hour: 22,
        minute: 0,
        day: null,
        title: 'New bike 🫙',
        body: 'Drop ₾5 in the jar day?',
      },
      // Made on the 31st: the 28th, so every month has it.
      expect.objectContaining({ id: 'jar-laptop', day: 28, body: 'Drop ₾300 in the jar month?' }),
    ]);
  });

  it('says nothing while Reminders is off, for jars without a time or closed ones', () => {
    expect(planJarReminders([jar], false, money, words)).toEqual([]);
    expect(planJarReminders([{ ...jar, remindAt: null }], true, money, words)).toEqual([]);
    expect(planJarReminders([{ ...jar, closedAt: '2026-11-01' }], true, money, words)).toEqual([]);
  });

  it('reads and writes the time', () => {
    expect(parseTime('22:00')).toEqual({ hour: 22, minute: 0 });
    expect(parseTime('7:05')).toEqual({ hour: 7, minute: 5 });
    expect(parseTime('25:00')).toBeNull();
    expect(formatTime(7, 5)).toBe('07:05');
  });
});
