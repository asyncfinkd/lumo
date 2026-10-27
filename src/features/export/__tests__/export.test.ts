import {
  buildCsv,
  buildHtml,
  csvCell,
  type ExportWords,
  inRange,
  plainAmount,
  rangeStart,
} from '../export';

const words: ExportWords = {
  category: (id) => (id ? `cat:${id}` : 'No category'),
  transactions: 'Transactions',
  budgets: 'Budgets',
  billsAndIncome: 'Bills and income',
  columns: {
    date: 'Date',
    time: 'Time',
    type: 'Type',
    category: 'Category',
    title: 'Name',
    note: 'Note',
    amount: 'Amount',
    currency: 'Currency',
    added: 'Added',
    limit: 'Monthly budget',
    name: 'Name',
    day: 'Day of month',
    auto: 'Added automatically',
  },
  kind: { expense: 'Expense', income: 'Income', bill: 'Bill', salary: 'Income' },
  source: {
    manual: 'By you',
    bill: 'From your bills',
    recurring_income: 'From your income',
    adjustment: 'Balance adjusted',
  },
  yes: 'Yes',
  no: 'No',
};

const tx = (o: Partial<Parameters<typeof inRange>[0][number]> & { date: string }) => ({
  kind: 'expense' as const,
  amountMinor: 6420,
  currency: 'GEL' as const,
  categoryId: 'groceries',
  title: 'Fresh Market',
  note: null,
  occurredAt: `${o.date}T10:15:00.000Z`,
  source: 'manual' as const,
  ...o,
});

describe('rangeStart', () => {
  it('starts each range on the right day', () => {
    expect(rangeStart('month', '2026-10-27')).toBe('2026-10-01');
    expect(rangeStart('three', '2026-10-27')).toBe('2026-08-01');
    expect(rangeStart('three', '2026-02-10')).toBe('2025-12-01');
    expect(rangeStart('year', '2026-10-27')).toBe('2026-01-01');
    expect(rangeStart('all', '2026-10-27')).toBeNull();
  });
});

describe('inRange', () => {
  const rows = [tx({ date: '2026-09-30' }), tx({ date: '2026-10-27' }), tx({ date: '2026-10-01' })];
  it('keeps the range, oldest first, nothing after today', () => {
    expect(inRange(rows, 'month', '2026-10-27').map((r) => r.date)).toEqual([
      '2026-10-01',
      '2026-10-27',
    ]);
    expect(inRange(rows, 'all', '2026-10-26').map((r) => r.date)).toEqual([
      '2026-09-30',
      '2026-10-01',
    ]);
  });
});

describe('csv', () => {
  it('quotes commas, quotes and new lines', () => {
    expect(csvCell('Fresh Market')).toBe('Fresh Market');
    expect(csvCell('Coffee, cake')).toBe('"Coffee, cake"');
    expect(csvCell('the "good" one')).toBe('"the ""good"" one"');
  });

  it('never lets a spreadsheet run a cell as a formula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('@me')).toBe("'@me");
  });

  it('writes amounts as plain signed numbers', () => {
    expect(plainAmount(-123456, 'GEL')).toBe('-1234.56');
    expect(plainAmount(380000, 'GEL')).toBe('3800.00');
  });

  it('has transactions, budgets, and bills and income, with a BOM for Excel', () => {
    const csv = buildCsv(
      {
        transactions: [
          tx({ date: '2026-10-27', note: 'Weekly, big' }),
          tx({
            date: '2026-10-26',
            kind: 'income',
            amountMinor: 380000,
            source: 'recurring_income',
            title: 'Salary',
            categoryId: 'salary',
          }),
        ],
        budgets: [{ categoryId: 'groceries', limitMinor: 90000, currency: 'GEL' }],
        bills: [
          {
            name: 'Rent',
            amountMinor: 80000,
            currency: 'GEL',
            day: 1,
            categoryId: 'home',
            active: false,
          },
        ],
        incomes: [{ name: 'Salary', amountMinor: 380000, currency: 'GEL', day: 26 }],
      },
      words,
    );
    expect(csv.startsWith('\uFEFFTransactions\r\n')).toBe(true);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[1]).toBe('Date,Time,Type,Category,Name,Note,Amount,Currency,Added');
    expect(lines[2]).toMatch(
      /^2026-10-27,\d\d:\d\d,Expense,cat:groceries,Fresh Market,"Weekly, big",-64\.20,GEL,By you$/,
    );
    expect(lines[3]).toMatch(/,Income,cat:salary,Salary,,3800\.00,GEL,From your income$/);
    expect(lines).toContain('cat:groceries,900.00,GEL');
    expect(lines).toContain('Bill,Rent,cat:home,800.00,GEL,1,No');
    expect(lines).toContain('Income,Salary,,3800.00,GEL,26,Yes');
  });
});

describe('pdf', () => {
  it('sums came in and went out without adjustments, and escapes names', () => {
    const html = buildHtml(
      {
        transactions: [
          tx({ date: '2026-10-27', title: '<b>Shop</b>' }),
          tx({ date: '2026-10-26', kind: 'income', amountMinor: 380000 }),
          tx({ date: '2026-10-25', kind: 'income', amountMinor: 999, source: 'adjustment' }),
        ],
        budgets: [],
        bills: [],
        incomes: [],
      },
      'GEL',
      {
        ...words,
        title: 'Lumo',
        period: 'October 2026',
        cameIn: 'Came in',
        wentOut: 'Went out',
        byCategory: 'By category',
        footer: 'Made with Lumo',
      },
    );
    expect(html).toContain('Came in<b>₾3,800.00</b>');
    expect(html).toContain('Went out<b>₾64.20</b>');
    expect(html).toContain('&lt;b&gt;Shop&lt;/b&gt;');
    expect(html).not.toContain('<b>Shop</b>');
    // An adjustment is named like History, not by what it was saved as.
    expect(html).toContain('<td>Balance adjusted</td>');
  });
});
