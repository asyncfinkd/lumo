/**
 * @jest-environment node
 */
// Accounts and transfers (#21), run on the real migrations.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { MAIN_ACCOUNT_ID } from '@/db/accounts';
import {
  accounts,
  incomes,
  jarEntries,
  recurringBills,
  transactions,
  transfers,
} from '@/db/schema';
import { openTestDb } from '@/db/testing';
import {
  adjustBalance,
  currentAccountBalance,
  currentBalance,
  markOnboarded,
  saveProfile,
} from '../../profile/repo';
import { saveBill, saveIncome, syncDueTransactions } from '../../recurring/repo';
import { addToJar, closeJar, createJar } from '../../savings/repo';
import { addTransaction } from '../../transactions/repo';
import {
  accountsQuery,
  addTransfer,
  createAccount,
  deleteAccount,
  deleteTransfer,
  updateAccount,
  updateTransfer,
} from '../repo';

const id = randomUUID;
const today = '2026-10-27';

/** Someone with ₾1,000 in Main and ₾200 in Cash. */
function setUp() {
  const db = openTestDb();
  saveProfile(db, { name: 'Nika', currency: 'GEL', payday: 5 }, id);
  markOnboarded(db, new Date('2026-10-01T08:00:00'));
  adjustBalance(db, 100000, '2026-10-01', undefined, id);
  const cash = createAccount(db, { name: ' Cash ', kind: 'cash', startMinor: 20000 }, today, id);
  return { db, cash: cash.id };
}

const balanceOf = (db: ReturnType<typeof openTestDb>, accountId: string) =>
  currentAccountBalance(db, accountId);

describe('accounts', () => {
  it('starts everyone with Main, holding the whole balance', () => {
    const db = openTestDb();
    saveProfile(db, { name: 'Nika', currency: 'GEL', payday: 5 }, id);
    expect(accountsQuery(db).all()).toMatchObject([{ id: MAIN_ACCOUNT_ID, name: 'Main' }]);
    adjustBalance(db, 50000, today, undefined, id);
    expect(balanceOf(db, MAIN_ACCOUNT_ID)).toBe(50000);
    expect(currentBalance(db)).toBe(50000);
  });

  it('adds an account after Main, its starting amount adding to the total', () => {
    const { db, cash } = setUp();
    expect(
      accountsQuery(db)
        .all()
        .map((a) => [a.name, a.kind, a.color, a.sortOrder]),
    ).toEqual([
      ['Main', 'debit', 'latte', 0],
      ['Cash', 'cash', 'sage', 1],
    ]);
    expect(balanceOf(db, cash)).toBe(20000);
    expect(balanceOf(db, MAIN_ACCOUNT_ID)).toBe(100000);
    expect(currentBalance(db)).toBe(120000);
  });

  it('turns away an account without a name or with a negative start', () => {
    const { db } = setUp();
    expect(() => createAccount(db, { name: '  ', kind: 'cash', startMinor: 0 }, today)).toThrow();
    expect(() => createAccount(db, { name: 'Card', kind: 'debit', startMinor: -1 }, today)).toThrow(
      RangeError,
    );
  });

  it('marks Main renamed only once its name changes', () => {
    const { db } = setUp();
    updateAccount(db, MAIN_ACCOUNT_ID, { name: 'Main', kind: 'cash' });
    expect(accountsQuery(db).all()[0]).toMatchObject({ kind: 'cash', renamed: false });
    // Saved as shown in Georgian, unchanged: still Main, still translated.
    updateAccount(db, MAIN_ACCOUNT_ID, { name: 'მთავარი', kind: 'cash', renamed: false });
    expect(accountsQuery(db).all()[0]).toMatchObject({ name: 'Main', renamed: false });
    updateAccount(db, MAIN_ACCOUNT_ID, { name: 'TBC card', kind: 'debit', color: 'sky' });
    expect(accountsQuery(db).all()[0]).toMatchObject({
      name: 'TBC card',
      color: 'sky',
      renamed: true,
    });
  });

  it('fixes one account’s balance without touching the others', () => {
    const { db, cash } = setUp();
    adjustBalance(db, 18500, today, cash, id);
    expect(balanceOf(db, cash)).toBe(18500);
    expect(balanceOf(db, MAIN_ACCOUNT_ID)).toBe(100000);
  });

  it('keeps transactions, bills and jar money in their own account', () => {
    const { db, cash } = setUp();
    addTransaction(
      db,
      {
        kind: 'expense',
        amountMinor: 1150,
        categoryId: 'coffee',
        title: 'Coffee',
        date: today,
        accountId: cash,
      },
      id,
    );
    const jar = createJar(
      db,
      {
        name: 'Laptop',
        tone: 'sky',
        goalMinor: 100000,
        planMinor: 10000,
        cadence: 'month',
        remindAt: null,
      },
      today,
      id,
    );
    addToJar(db, jar, 5000, today, cash, id);
    expect(balanceOf(db, cash)).toBe(20000 - 1150 - 5000);
    expect(balanceOf(db, MAIN_ACCOUNT_ID)).toBe(100000);

    // Closing the jar puts its money back where the last drop came from.
    closeJar(db, jar, today, id);
    expect(balanceOf(db, cash)).toBe(20000 - 1150);

    // A bill's payments land in its account.
    saveBill(db, { name: 'Rent', amountMinor: 80000, day: 10, categoryId: 'home' }, id);
    db.update(recurringBills).set({ accountId: cash }).run();
    syncDueTransactions(db, today, id);
    const rent = db.select().from(transactions).where(eq(transactions.title, 'Rent')).get();
    expect(rent?.accountId).toBe(cash);
  });
});

describe('transfers', () => {
  it('moves money between accounts without changing the total', () => {
    const { db, cash } = setUp();
    const move = addTransfer(
      db,
      { fromAccountId: MAIN_ACCOUNT_ID, toAccountId: cash, amountMinor: 30000, date: today },
      id,
    );
    expect(balanceOf(db, MAIN_ACCOUNT_ID)).toBe(70000);
    expect(balanceOf(db, cash)).toBe(50000);
    expect(currentBalance(db)).toBe(120000);

    updateTransfer(db, move.id, {
      fromAccountId: cash,
      toAccountId: MAIN_ACCOUNT_ID,
      amountMinor: 5000,
      date: today,
      note: 'Change',
    });
    expect(balanceOf(db, cash)).toBe(15000);
    expect(db.select().from(transfers).get()).toMatchObject({ note: 'Change', currency: 'GEL' });

    deleteTransfer(db, move.id);
    expect(balanceOf(db, cash)).toBe(20000);
  });

  it('needs two accounts and an amount', () => {
    const { db, cash } = setUp();
    const base = { fromAccountId: cash, toAccountId: MAIN_ACCOUNT_ID, date: today };
    expect(() => addTransfer(db, { ...base, amountMinor: 0 })).toThrow(RangeError);
    expect(() => addTransfer(db, { ...base, toAccountId: cash, amountMinor: 100 })).toThrow();
  });
});

describe('deleting an account', () => {
  function withMoves() {
    const { db, cash } = setUp();
    const card = createAccount(db, { name: 'Card', kind: 'debit', startMinor: 0 }, today, id).id;
    addTransaction(
      db,
      {
        kind: 'expense',
        amountMinor: 1150,
        categoryId: 'coffee',
        title: 'Coffee',
        date: today,
        accountId: cash,
      },
      id,
    );
    addTransfer(
      db,
      { fromAccountId: MAIN_ACCOUNT_ID, toAccountId: cash, amountMinor: 30000, date: today },
      id,
    );
    addTransfer(db, { fromAccountId: cash, toAccountId: card, amountMinor: 1000, date: today }, id);
    db.update(incomes).set({ accountId: cash }).run();
    return { db, cash, card };
  }

  it('moves everything to another account and keeps the total', () => {
    const { db, cash, card } = withMoves();
    const total = currentBalance(db);
    const mainBefore = balanceOf(db, MAIN_ACCOUNT_ID)!;
    const cashBefore = balanceOf(db, cash)!;

    deleteAccount(db, cash, { moveTo: MAIN_ACCOUNT_ID }, today, id);

    expect(
      accountsQuery(db)
        .all()
        .map((a) => a.id),
    ).toEqual([MAIN_ACCOUNT_ID, card]);
    expect(currentBalance(db)).toBe(total);
    expect(balanceOf(db, MAIN_ACCOUNT_ID)).toBe(mainBefore + cashBefore);
    // Main → Cash is gone; Cash → Card is now Main → Card.
    expect(db.select().from(transfers).all()).toMatchObject([
      { fromAccountId: MAIN_ACCOUNT_ID, toAccountId: card, amountMinor: 1000 },
    ]);
  });

  it('deletes its transactions and both sides of its moves', () => {
    const { db, cash, card } = withMoves();
    deleteAccount(db, cash, 'delete', today, id);

    expect(db.select().from(transactions).where(eq(transactions.accountId, cash)).all()).toEqual(
      [],
    );
    expect(db.select().from(transfers).all()).toEqual([]);
    expect(balanceOf(db, MAIN_ACCOUNT_ID)).toBe(100000);
    expect(balanceOf(db, card)).toBe(0);
    // Its salary doesn't vanish with it.
    expect(
      db
        .select()
        .from(incomes)
        .all()
        .every((i) => i.accountId === MAIN_ACCOUNT_ID),
    ).toBe(true);
  });

  it('never deletes the last account', () => {
    const db = openTestDb();
    expect(() => deleteAccount(db, MAIN_ACCOUNT_ID, 'delete', today, id)).toThrow();
    expect(db.select().from(accounts).all()).toHaveLength(1);
  });

  it('sends new money to the first account left once Main is gone', () => {
    const { db, cash } = setUp();
    deleteAccount(db, MAIN_ACCOUNT_ID, { moveTo: cash }, today, id);
    addTransaction(
      db,
      { kind: 'expense', amountMinor: 500, categoryId: 'coffee', title: 'Coffee', date: today },
      id,
    );
    adjustBalance(db, 150000, today, undefined, id);
    saveBill(db, { name: 'Gym', amountMinor: 3000, day: 2, categoryId: 'home' }, id);
    const jar = createJar(
      db,
      {
        name: 'Trip',
        tone: 'gold',
        goalMinor: 50000,
        planMinor: 5000,
        cadence: 'month',
        remindAt: null,
      },
      today,
      id,
    );
    addToJar(db, jar, 1000, today, undefined, id);
    expect(
      db
        .select()
        .from(transactions)
        .all()
        .every((t) => t.accountId === cash),
    ).toBe(true);
    expect(
      db
        .select()
        .from(recurringBills)
        .all()
        .every((b) => b.accountId === cash),
    ).toBe(true);
    expect(db.select().from(jarEntries).all()).toMatchObject([{ accountId: cash }]);
  });

  it('keeps jar money when its account goes', () => {
    const { db, cash } = setUp();
    const jar = createJar(
      db,
      {
        name: 'Trip',
        tone: 'gold',
        goalMinor: 50000,
        planMinor: 5000,
        cadence: 'month',
        remindAt: null,
      },
      today,
      id,
    );
    addToJar(db, jar, 5000, today, cash, id);
    deleteAccount(db, cash, 'delete', today, id);
    expect(db.select().from(jarEntries).all()).toMatchObject([
      { amountMinor: 5000, accountId: MAIN_ACCOUNT_ID },
    ]);
    // Main never put that money in, so its balance stays the same.
    expect(balanceOf(db, MAIN_ACCOUNT_ID)).toBe(100000);
  });

  it('never pays its bills and salary again from the next account', () => {
    const { db, cash } = setUp();
    saveIncome(db, { name: 'Salary', amountMinor: 300000, day: 10 }, id);
    db.update(incomes).set({ accountId: cash }).run();
    syncDueTransactions(db, today, id);
    deleteAccount(db, cash, 'delete', today, id);
    syncDueTransactions(db, today, id);
    expect(db.select().from(transactions).where(eq(transactions.title, 'Salary')).all()).toEqual(
      [],
    );
    expect(balanceOf(db, MAIN_ACCOUNT_ID)).toBe(100000);
  });
});
