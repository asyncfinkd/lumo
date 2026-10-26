/**
 * @jest-environment node
 */
import { randomUUID } from 'node:crypto';
import { incomes, profile, recurringBills } from '@/db/schema';
import { openTestDb } from '@/db/testing';
import { summarizeMonth } from '../../money/summary';
import { syncDueTransactions } from '../../recurring/repo';
import { groupTyped } from '@/components/AmountDisplay';
import { BILL_KEYS, billCategory, cleanAmount } from '../bills';
import { chosenBills, type OnboardingAnswers, saveOnboarding } from '../save';
import { useOnboarding } from '../store';

const billName = (key: string) => key[0]!.toUpperCase() + key.slice(1);

function answers(overrides: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  const bills = Object.fromEntries(
    BILL_KEYS.map((k) => [k, { on: false, amount: '' }]),
  ) as OnboardingAnswers['bills'];
  return { name: 'Nika', currency: 'GEL', income: '3800', payday: 5, bills, ...overrides };
}

// docs/sample-data.md bills.
const sampleBills = {
  rent: { on: true, amount: '800' },
  utilities: { on: true, amount: '180' },
  internet: { on: true, amount: '50' },
  phone: { on: true, amount: '30' },
  gym: { on: true, amount: '70' },
  spotify: { on: true, amount: '20' },
};

describe('chosenBills', () => {
  it('keeps bills that are on and have an amount above 0', () => {
    const a = answers();
    a.bills.rent = { on: true, amount: '800' };
    a.bills.gym = { on: true, amount: '' };
    a.bills.phone = { on: false, amount: '30' };
    a.bills.spotify = { on: true, amount: '0' };
    a.bills.utilities = { on: true, amount: '180.5' };
    expect(chosenBills(a)).toEqual([
      { key: 'rent', amountMinor: 80000 },
      { key: 'utilities', amountMinor: 18050 },
    ]);
  });

  it('counts rent as Home and everything else as Bills (#4)', () => {
    expect(billCategory.rent).toBe('home');
    expect(BILL_KEYS.filter((k) => k !== 'rent').every((k) => billCategory[k] === 'bills')).toBe(
      true,
    );
  });
});

describe('saveOnboarding', () => {
  it('saves profile, salary and bills, then marks onboarding done', () => {
    const db = openTestDb();
    const a = answers();
    Object.assign(a.bills, sampleBills);
    saveOnboarding(db, a, billName, 'Salary', randomUUID);

    expect(db.select().from(profile).get()).toMatchObject({
      name: 'Nika',
      currency: 'GEL',
      payday: 5,
    });
    expect(db.select().from(profile).get()!.onboardedAt).toBeTruthy();
    expect(db.select().from(incomes).all()).toMatchObject([
      { name: 'Salary', amountMinor: 380000, day: 5, currency: 'GEL' },
    ]);
    const bills = db.select().from(recurringBills).all();
    expect(bills).toHaveLength(6);
    expect(bills.find((b) => b.name === 'Rent')).toMatchObject({ categoryId: 'home', day: 5 });
  });

  it('gives Home the numbers Your month showed: ₾3,800 − ₾1,150 = ₾2,650', () => {
    const db = openTestDb();
    const a = answers();
    Object.assign(a.bills, sampleBills);
    saveOnboarding(db, a, billName, 'Salary', randomUUID);

    const summary = summarizeMonth({
      today: '2026-10-26',
      payday: 5,
      incomes: db.select().from(incomes).all(),
      bills: db.select().from(recurringBills).all(),
      transactions: [],
    });
    expect(summary.left.availableMinor).toBe(265000);
  });

  it('starts tracking today: nothing earlier this period is created', () => {
    const db = openTestDb();
    const a = answers();
    Object.assign(a.bills, sampleBills);
    saveOnboarding(db, a, billName, 'Salary', randomUUID);
    // Payday the 5th and all bills on the 5th are before today.
    expect(syncDueTransactions(db, '2026-10-26', randomUUID)).toBe(0);
  });

  it('refuses an income of 0 and saves nothing', () => {
    const db = openTestDb();
    expect(() =>
      saveOnboarding(db, answers({ income: '0' }), billName, 'Salary', randomUUID),
    ).toThrow(RangeError);
    expect(db.select().from(profile).all()).toHaveLength(0);
  });
});

describe('onboarding store', () => {
  afterEach(() => useOnboarding.getState().reset());

  it('starts with lari, no income and no bills', () => {
    const s = useOnboarding.getState();
    expect(s.currency).toBe('GEL');
    expect(s.income).toBe('0');
    expect(Object.values(s.bills).every((b) => !b.on)).toBe(true);
  });

  it('updates one bill without touching the others', () => {
    useOnboarding.getState().setBill('rent', { on: true });
    useOnboarding.getState().setBill('rent', { amount: '800' });
    const { bills } = useOnboarding.getState();
    expect(bills.rent).toEqual({ on: true, amount: '800' });
    expect(bills.gym).toEqual({ on: false, amount: '' });
  });

  it('resets everything', () => {
    useOnboarding.getState().setName('Nika');
    useOnboarding.getState().reset();
    expect(useOnboarding.getState().name).toBe('');
  });
});

describe('groupTyped', () => {
  it('groups thousands while typing', () => {
    expect(groupTyped('3800')).toBe('3,800');
    expect(groupTyped('3800.')).toBe('3,800.');
    expect(groupTyped('1234567.5')).toBe('1,234,567.5');
    expect(groupTyped('0')).toBe('0');
  });
});

describe('cleanAmount', () => {
  it('reads a comma as the decimal point (decimal keypads in many locales)', () => {
    expect(cleanAmount('12,50')).toBe('12.50');
    expect(cleanAmount('12.5')).toBe('12.5');
  });

  it('keeps digits and one point, two decimals at most', () => {
    expect(cleanAmount('1 200')).toBe('1200');
    expect(cleanAmount('1.2.3')).toBe('1.23');
    expect(cleanAmount('9.999')).toBe('9.99');
    expect(cleanAmount('₾80')).toBe('80');
  });
});
