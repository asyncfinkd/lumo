import { render, screen } from '@testing-library/react-native';
import '@/i18n';
import { typedAmount } from '@/components/Numpad';
import {
  buildSampleTransactions,
  SAMPLE_PAYDAY,
  sampleBills,
  sampleIncomes,
} from '@/db/sampleData';
import type { Transaction } from '@/db/schema';
import { summarizeMonth } from '@/features/money/summary';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { clockTime, greetingKey, recentDays } from '../home';
import { LeftToSpendCard } from '../LeftToSpendCard';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

/** Local time on Oct 31, 2026 as stored in `occurredAt`. */
const at = (h: number, m: number, day = 31) => new Date(2026, 9, day, h, m).toISOString();

function row(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.title ?? 'id',
    kind: 'expense',
    amountMinor: 1150,
    currency: 'GEL',
    categoryId: 'coffee',
    title: 'Coffee Lab',
    note: null,
    date: '2026-10-31',
    occurredAt: at(8, 40),
    source: 'manual',
    recurringId: null,
    createdAt: at(8, 40),
    updatedAt: at(8, 40),
    ...overrides,
  } as Transaction;
}

describe('greetingKey', () => {
  it('says morning from 5, afternoon from 12, evening from 18', () => {
    expect([4, 5, 11, 12, 17, 18, 23, 0].map(greetingKey)).toEqual([
      'evening',
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'evening',
      'evening',
      'evening',
    ]);
  });
});

describe('clockTime', () => {
  it('shows local 24-hour time without a leading zero', () => {
    expect(clockTime(at(8, 40))).toBe('8:40');
    expect(clockTime(at(18, 5))).toBe('18:05');
  });
});

describe('recentDays', () => {
  it('splits today and yesterday, earliest first, without balance adjustments', () => {
    const rows = [
      row({ title: 'Bolt', occurredAt: at(18, 20) }),
      row({ title: 'Fresh Market', occurredAt: at(13, 15) }),
      row({ title: 'Coffee Lab', occurredAt: at(8, 40) }),
      row({ title: 'Balance adjusted', source: 'adjustment', occurredAt: at(9, 0) }),
      row({ title: 'Gym', date: '2026-10-30', source: 'bill', occurredAt: at(0, 0, 30) }),
      row({ title: 'Older', date: '2026-10-29', occurredAt: at(12, 0, 29) }),
    ];
    const { today, yesterday } = recentDays(rows, '2026-10-31');
    expect(today.map((r) => r.title)).toEqual(['Coffee Lab', 'Fresh Market', 'Bolt']);
    expect(yesterday.map((r) => r.title)).toEqual(['Gym']);
  });
});

describe('typedAmount', () => {
  it('turns minor units into keypad text', () => {
    expect(typedAmount(1248050, 'GEL')).toBe('12480.50');
    expect(typedAmount(1248055, 'GEL')).toBe('12480.55');
    expect(typedAmount(380000, 'GEL')).toBe('3800');
    expect(typedAmount(5, 'GEL')).toBe('0.05');
  });
});

describe('LeftToSpendCard', () => {
  const sample = summarizeMonth({
    today: '2026-10-31',
    payday: SAMPLE_PAYDAY,
    incomes: sampleIncomes,
    bills: sampleBills,
    transactions: buildSampleTransactions('2026-10-31'),
  });

  it('matches the design with the sample data', async () => {
    await render(<LeftToSpendCard summary={sample} currency="GEL" onBalance={jest.fn()} />);
    expect(screen.getByLabelText('₾799.70 left of ₾2,650')).toBeOnTheScreen();
    expect(screen.getByText('70% spent')).toBeOnTheScreen();
    expect(screen.getByText('5 days left')).toBeOnTheScreen();
    expect(screen.getByText('₾12,480.50')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', {
      min: 0,
      max: 100,
      now: 30,
    });
  });

  it('shows ₾0 and a gentle line when overspent', async () => {
    const over = {
      ...sample,
      left: { ...sample.left, leftMinor: 0, overMinor: 12050, spentPercent: 105 },
    };
    await render(<LeftToSpendCard summary={over} currency="GEL" onBalance={jest.fn()} />);
    expect(screen.getByLabelText('₾0.00 left of ₾2,650')).toBeOnTheScreen();
    expect(screen.getByText("₾120.50 over this month. That's okay, it happens.")).toBeOnTheScreen();
  });

  it('asks for the balance until one is set', async () => {
    const onBalance = jest.fn();
    await render(
      <LeftToSpendCard
        summary={{ ...sample, balanceMinor: null }}
        currency="GEL"
        onBalance={onBalance}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add your balance' })).toBeOnTheScreen();
  });
});

describe('TransactionRow', () => {
  it('shows category and time for something typed in', async () => {
    await render(<TransactionRow transaction={row({})} />);
    expect(screen.getByText('Coffee · 8:40')).toBeOnTheScreen();
    expect(screen.getByText('−₾11.50')).toBeOnTheScreen();
  });

  it('marks bills and income', async () => {
    await render(
      <>
        <TransactionRow
          transaction={row({
            title: 'Gym',
            categoryId: 'bills',
            source: 'bill',
            amountMinor: 7000,
          })}
        />
        <TransactionRow
          transaction={row({
            title: 'Salary',
            kind: 'income',
            categoryId: 'salary',
            source: 'recurring_income',
            amountMinor: 380000,
          })}
        />
      </>,
    );
    expect(screen.getByText('Bills · monthly bill')).toBeOnTheScreen();
    expect(screen.getByText('Salary · monthly income')).toBeOnTheScreen();
    expect(screen.getByText('+₾3,800.00')).toBeOnTheScreen();
  });
});
