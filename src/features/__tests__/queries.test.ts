/**
 * @jest-environment node
 */
// The SQL sums and lookups from issue 111, run on the real migrations and
// checked against the pure functions they replace on screens: same rules
// (adjustments out, only `manual` is spending, jar money off the balance),
// same numbers.
import { randomUUID } from 'node:crypto';
import { incomes, jarEntries, recurringBills, transactions, transfers } from '@/db/schema';
import { seedSampleData } from '@/db/seed';
import { openTestDb } from '@/db/testing';
import { accountBalances, balanceFromTotals, totalBalance } from '@/domain/balance';
import { categorySpent } from '@/domain/budgets';
import { addDays, calendarMonth, payPeriod } from '@/domain/dates';
import { lastUsedAccount } from '../accounts/lastUsed';
import { addTransfer, createAccount } from '../accounts/repo';
import { inRange, rangeStart } from '../export/export';
import { monthChange, monthChangeFromTotals, monthChangeSince } from '../home/home';
import { monthSpent, searchTerms, searchTransactions } from '../history/history';
import { rankSpending, spendingByCategory } from '../insights/insights';
import {
  accountTotalsQuery,
  jarBalanceQuery,
  jarTotalsByAccountQuery,
  periodFlowQuery,
  readBalanceTotals,
  toBalanceTotals,
  transactionBalanceQuery,
  transferTotalsQuery,
} from '../money/repo';
import { summarizeMonth, summarizePeriod } from '../money/summary';
import { adjustBalance, currentAccountBalance, currentBalance } from '../profile/repo';
import { addToJar, createJar, takeFromJar } from '../savings/repo';
import {
  addTransaction,
  categoryTotalsQuery,
  exportCountQuery,
  exportQuery,
  flowTotalsQuery,
  lastUsedQuery,
  likePattern,
  manualDatesQuery,
  searchQuery,
  transactionById,
  transactionsList,
} from '../transactions/repo';

const today = '2026-10-31';
const id = randomUUID;

/** docs/sample-data.md, plus a second account, a transfer and a jar. */
function sampleDb() {
  const db = openTestDb();
  seedSampleData(db, today, id);
  const cash = createAccount(db, { name: 'Cash', kind: 'cash', startMinor: 20000 }, today, id);
  addTransfer(
    db,
    {
      fromAccountId: 'main',
      toAccountId: cash.id,
      amountMinor: 5000,
      date: '2026-10-30',
    },
    id,
  );
  addTransaction(db, { ...coffee, accountId: cash.id, date: '2026-10-29' }, id);
  const jar = createJar(
    db,
    {
      name: 'Trip',
      tone: 'sky',
      goalMinor: 100000,
      planMinor: 10000,
      cadence: 'month',
      remindAt: null,
    },
    '2026-09-01',
    id,
  );
  addToJar(db, jar, 30000, '2026-09-15', 'main', id);
  takeFromJar(db, jar, 2000, '2026-10-20', cash.id, id);
  return { db, cash: cash.id };
}

const coffee = {
  kind: 'expense' as const,
  amountMinor: 1150,
  categoryId: 'coffee' as const,
  title: 'Coffee Lab',
  note: 'oat 100%_flat',
  date: today,
};

function everything(db: ReturnType<typeof openTestDb>) {
  return {
    rows: db.select().from(transactions).all(),
    jars: db.select().from(jarEntries).all(),
    moves: db.select().from(transfers).all(),
  };
}

describe('the pay-period summary in SQL', () => {
  it('matches summarizeMonth over every row, and docs/sample-data.md', () => {
    const db = openTestDb();
    seedSampleData(db, today, id);
    const { rows } = everything(db);
    const period = payPeriod(today, 5);
    const input = {
      today,
      payday: 5,
      incomes: db.select().from(incomes).all(),
      bills: db.select().from(recurringBills).all(),
    };

    const fromSql = summarizePeriod({
      ...input,
      periodTransactions: periodFlowQuery(db, period.start, period.end).all(),
      balance: readBalanceTotals(db).now,
    });
    expect(fromSql).toEqual(summarizeMonth({ ...input, transactions: rows }));
    expect(fromSql.left.leftMinor).toBe(79970);
    expect(fromSql.cameInMinor).toBe(380000);
    expect(fromSql.wentOutMinor).toBe(300030);
    expect(fromSql.balanceMinor).toBe(1248050);
  });

  it('sums per day, kind and source: a few rows, not every transaction', () => {
    const { db } = sampleDb();
    const period = payPeriod(today, 5);
    const flow = periodFlowQuery(db, period.start, period.end).all();
    const keys = flow.map((r) => `${r.date}/${r.kind}/${r.source}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(flow.length).toBeLessThan(everything(db).rows.length);
  });

  it('keeps adjustments out of came in / went out and jar money off the balance', () => {
    const { db } = sampleDb();
    const { rows, jars } = everything(db);
    const period = payPeriod(today, 5);
    const fromSql = summarizePeriod({
      today,
      payday: 5,
      incomes: [],
      bills: [],
      periodTransactions: periodFlowQuery(db, period.start, period.end).all(),
      balance: readBalanceTotals(db).now,
    });
    const fromRows = summarizeMonth({
      today,
      payday: 5,
      incomes: [],
      bills: [],
      transactions: rows,
      jarEntries: jars,
    });
    expect(fromSql).toEqual(fromRows);
    // Cash's ₾200 start is an adjustment: in the balance, never in Came in.
    expect(fromSql.cameInMinor).toBe(380000);
    expect(fromSql.balanceMinor).toBe(1248050 + 20000 - 1150 - 30000 + 2000);
    expect(currentBalance(db)).toBe(fromSql.balanceMinor);
  });

  it('has no balance until there is an adjustment', () => {
    const db = openTestDb();
    expect(balanceFromTotals(readBalanceTotals(db).now)).toBeNull();
    expect(totalBalance([])).toBeNull();
  });

  it('works out the change since the 1st as monthChange does', () => {
    const { db } = sampleDb();
    const { rows, jars } = everything(db);
    for (const day of ['2026-10-31', '2026-11-03', '2026-09-20']) {
      const since = monthChangeSince(day);
      const totals = toBalanceTotals(
        transactionBalanceQuery(db, since).get(),
        jarBalanceQuery(db, since).get(),
      );
      expect(monthChangeFromTotals(since, totals.before, totals.now)).toEqual(
        monthChange(rows, day, jars),
      );
    }
  });
});

describe('account balances in SQL', () => {
  it('match accountBalances over every row', () => {
    const { db, cash } = sampleDb();
    const { rows, jars, moves } = everything(db);
    const ids = ['main', cash];
    const fromSql = accountBalances(
      ids,
      accountTotalsQuery(db).all(),
      jarTotalsByAccountQuery(db).all(),
      transferTotalsQuery(db).all(),
    );
    expect(fromSql).toEqual(accountBalances(ids, rows, jars, moves));
    expect(fromSql.get(cash)).toBe(20000 + 5000 - 1150 + 2000);
    expect(currentAccountBalance(db, cash)).toBe(fromSql.get(cash));
  });

  it('count transactions per account ("Used in")', () => {
    const { db, cash } = sampleDb();
    const counted = accountTotalsQuery(db, cash)
      .all()
      .reduce((n, r) => n + r.count, 0);
    expect(counted).toBe(everything(db).rows.filter((r) => r.accountId === cash).length);
  });

  it('a new adjustment lands on what SQL says the account holds', () => {
    const { db, cash } = sampleDb();
    adjustBalance(db, 10000, today, cash, id);
    expect(currentAccountBalance(db, cash)).toBe(10000);
  });
});

describe('totals per category and per kind in SQL', () => {
  it('rank spending as spendingByCategory does', () => {
    const { db } = sampleDb();
    const { rows } = everything(db);
    const period = payPeriod(today, 5);
    for (const [start, end] of [
      [period.start, period.end],
      ['2026-10-26', '2026-11-01'],
      [today, addDays(today, 1)],
    ] as const) {
      expect(rankSpending(categoryTotalsQuery(db, start, end).all())).toEqual(
        spendingByCategory(rows, start, end),
      );
    }
  });

  it('give the same per-category spending as categorySpent, bills included', () => {
    const { db } = sampleDb();
    const { rows } = everything(db);
    const period = payPeriod(today, 5);
    const totals = categoryTotalsQuery(db, period.start, period.end).all();
    for (const category of ['coffee', 'groceries', 'home', 'bills']) {
      const row = totals.find((r) => r.kind === 'expense' && r.categoryId === category);
      expect(row?.amountMinor ?? 0).toBe(categorySpent(rows, category, period));
    }
  });

  it('give this month’s spending as monthSpent does, adjustments left out', () => {
    const { db } = sampleDb();
    const { rows } = everything(db);
    const month = calendarMonth(today);
    const flow = flowTotalsQuery(db, month.start, month.end).all();
    expect(flow.find((r) => r.kind === 'expense')?.amountMinor).toBe(monthSpent(rows, today));
    expect(flow.find((r) => r.kind === 'income')?.amountMinor).toBe(
      rows
        .filter((r) => r.kind === 'income' && r.source !== 'adjustment')
        .filter((r) => r.date.startsWith('2026-10'))
        .reduce((sum, r) => sum + r.amountMinor, 0),
    );
  });
});

describe('one row, a few rows', () => {
  it('reads one transaction by id', () => {
    const { db } = sampleDb();
    const added = addTransaction(db, coffee, id);
    expect(transactionById(db, added.id).all()).toEqual([added]);
    expect(transactionById(db, 'nope').all()).toEqual([]);
  });

  it('lists one account’s transactions only', () => {
    const { db, cash } = sampleDb();
    expect(
      transactionsList(db, cash)
        .all()
        .map((r) => r.accountId),
    ).toEqual([cash, cash]);
    expect(transactionsList(db).all()).toHaveLength(everything(db).rows.length);
  });

  it('finds the account used last as lastUsedAccount does', () => {
    const { db, cash } = sampleDb();
    const { rows } = everything(db);
    const ids = ['main', cash];
    for (const kind of ['expense', 'income'] as const) {
      expect(lastUsedAccount(lastUsedQuery(db, kind, ids).all(), kind, ids)).toBe(
        lastUsedAccount(rows, kind, ids),
      );
    }
  });

  it('finds the days with something added by hand', () => {
    const { db } = sampleDb();
    const { rows } = everything(db);
    const days = manualDatesQuery(db, '2026-10-25', '2026-11-01')
      .all()
      .map((r) => r.date)
      .sort();
    expect(days).toEqual(
      [
        ...new Set(
          rows
            .filter((r) => r.source === 'manual' && r.date >= '2026-10-25' && r.date < '2026-11-01')
            .map((r) => r.date),
        ),
      ].sort(),
    );
  });

  it('reads and counts an export as inRange does', () => {
    const { db } = sampleDb();
    const { rows } = everything(db);
    for (const range of ['month', 'three', 'all'] as const) {
      const start = rangeStart(range, today);
      const end = addDays(today, 1);
      const expected = inRange(rows, range, today);
      expect(exportQuery(db, start, end).all()).toEqual(expected);
      expect(exportCountQuery(db, start, end).get()?.count).toBe(expected.length);
    }
  });
});

describe('HistorySearch in SQL', () => {
  const categories = [
    { id: 'coffee', label: 'Coffee' },
    { id: 'groceries', label: 'Groceries' },
  ];
  const run = (db: ReturnType<typeof openTestDb>, query: string, filter = 'all' as const) => {
    const terms = searchTerms(query, categories, 'Balance adjusted');
    return searchQuery(db, { ...terms, filter }).all();
  };

  it('escapes LIKE wildcards', () => {
    expect(likePattern('100%_')).toBe('%100\\%\\_%');
  });

  it('finds by name or note, ignoring ASCII case', () => {
    const { db } = sampleDb();
    const added = addTransaction(db, coffee, id);
    expect(run(db, 'coffee lab').map((r) => r.title)).toContain('Coffee Lab');
    const noted = run(db, '100%_');
    expect(noted.map((r) => r.id)).toContain(added.id);
    expect(noted.every((r) => r.note === coffee.note)).toBe(true);
    // A % typed is a percent sign, not "anything".
    expect(run(db, 'oat%flat')).toEqual([]);
  });

  it('finds by the shown category name and by amount', () => {
    const { db } = sampleDb();
    const { rows } = everything(db);
    expect(run(db, 'groc').every((r) => r.categoryId === 'groceries')).toBe(true);
    expect(run(db, 'groc')).toHaveLength(rows.filter((r) => r.categoryId === 'groceries').length);
    expect(run(db, '11.50').map((r) => r.amountMinor)).toContain(1150);
  });

  it('narrows by the chips, as searchTransactions does', () => {
    const { db } = sampleDb();
    const { rows } = everything(db);
    const describe = () => ({ category: '', amount: '' });
    for (const filter of ['all', 'spending', 'income', 'auto'] as const) {
      const fromSql = searchQuery(db, {
        query: '',
        filter,
        categoryIds: [],
        adjustments: false,
        digits: '',
        limit: 10000,
      }).all();
      expect(fromSql.map((r) => r.id).sort()).toEqual(
        searchTransactions(rows, '', filter, describe)
          .map((r) => r.id)
          .sort(),
      );
    }
  });
});
