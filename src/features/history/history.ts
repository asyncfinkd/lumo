// What History shows (#50): days newest first, each with its total, plus the
// search. Pure, so it's tested without React.

import { addDays, type CalendarDate } from '@/domain/dates';
import type { TransactionKind, TransactionSource } from '@/domain/leftToSpend';
import type { CurrencyCode } from '@/domain/money';
import type { JarTone } from '@/features/savings/savings';

type Listed = {
  id: string;
  kind: TransactionKind;
  amountMinor: number;
  date: CalendarDate;
  occurredAt: string;
  createdAt: string;
  source: TransactionSource;
};

export type DayGroup<T> = {
  date: CalendarDate;
  /** Came in minus went out that day; adjustments don't count. */
  totalMinor: number;
  /** The one added last first, as on Home. */
  rows: T[];
};

/** Bills and salary that Lumo added on their day. */
export function isAutomatic(t: { source: TransactionSource }): boolean {
  return t.source === 'bill' || t.source === 'recurring_income';
}

/** Every transaction by day, newest day first. */
export function dayGroups<T extends Listed>(transactions: readonly T[]): DayGroup<T>[] {
  const byDate = new Map<CalendarDate, T[]>();
  for (const t of transactions) {
    const rows = byDate.get(t.date);
    if (rows) rows.push(t);
    else byDate.set(t.date, [t]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rows]) => ({
      date,
      totalMinor: rows.reduce(
        (sum, t) =>
          t.source === 'adjustment' ? sum : sum + (t.kind === 'income' ? 1 : -1) * t.amountMinor,
        0,
      ),
      rows: rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
}

/**
 * A jar row in History (HistoryJars): money put in, taken out, or all of it
 * back when the jar closed ("Done").
 */
export type JarMove = {
  id: string;
  jarId: string;
  name: string;
  tone: JarTone;
  /** Positive into the jar, negative back to the balance. */
  amountMinor: number;
  currency: CurrencyCode;
  date: CalendarDate;
  createdAt: string;
  move: 'in' | 'out' | 'done';
  /** The account it came from or went back to. */
  accountId?: string;
};

/**
 * Every jar entry as a History row. A closed jar's last move out is the one
 * "Time to treat yourself" made: everything back, so it reads "Done".
 */
export function jarMoves(
  entries: readonly {
    id: string;
    jarId: string;
    amountMinor: number;
    date: CalendarDate;
    createdAt: string;
    accountId?: string;
  }[],
  jars: readonly {
    id: string;
    name: string;
    tone: JarTone;
    currency: CurrencyCode;
    closedAt: string | null;
  }[],
): JarMove[] {
  const byId = new Map(jars.map((j) => [j.id, j]));
  const lastOut = new Map<string, { id: string; createdAt: string }>();
  for (const e of entries) {
    if (e.amountMinor >= 0) continue;
    const prev = lastOut.get(e.jarId);
    if (!prev || e.createdAt >= prev.createdAt) lastOut.set(e.jarId, e);
  }
  const moves: JarMove[] = [];
  for (const e of entries) {
    const jar = byId.get(e.jarId);
    if (!jar || e.amountMinor === 0) continue;
    moves.push({
      id: e.id,
      jarId: jar.id,
      name: jar.name,
      tone: jar.tone,
      amountMinor: e.amountMinor,
      currency: jar.currency,
      date: e.date,
      createdAt: e.createdAt,
      move:
        e.amountMinor > 0
          ? 'in'
          : jar.closedAt && lastOut.get(jar.id)?.id === e.id
            ? 'done'
            : 'out',
      accountId: e.accountId,
    });
  }
  return moves;
}

/**
 * History's days with the jar moves in among the transactions, the one added
 * last first. A day's total stays what came in minus what went out: moving
 * money into a jar isn't spending, and taking it out isn't income.
 */
export function withJarMoves<T extends { createdAt: string }>(
  groups: readonly DayGroup<T>[],
  moves: readonly JarMove[],
): DayGroup<T | JarMove>[] {
  return mergeIntoDays(groups, moves, () => 0);
}

/**
 * A move between two accounts as a History row (HistoryAccounts), seen from
 * the account History shows: `between` under All accounts, `in` or `out`
 * when it's filtered to one side.
 */
export type TransferMove = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountMinor: number;
  currency: CurrencyCode;
  date: CalendarDate;
  occurredAt: string;
  createdAt: string;
  flow: 'between' | 'in' | 'out';
};

/** Every transfer as a History row; with `account`, only the ones it took part in. */
export function transferMoves(
  transfers: readonly Omit<TransferMove, 'flow'>[],
  account: string | null,
): TransferMove[] {
  return transfers
    .filter((t) => !account || t.fromAccountId === account || t.toAccountId === account)
    .map((t) => ({
      ...t,
      flow: !account ? 'between' : t.toAccountId === account ? 'in' : 'out',
    }));
}

/**
 * History's days with the transfers in among the rest. Under All accounts a
 * move changes no day's total (the money stays yours); for one account,
 * money moved in adds to the day and money moved out takes from it.
 */
export function withTransfers<T extends { createdAt: string }>(
  groups: readonly DayGroup<T>[],
  moves: readonly TransferMove[],
): DayGroup<T | TransferMove>[] {
  return mergeIntoDays(groups, moves, (m) =>
    m.flow === 'in' ? m.amountMinor : m.flow === 'out' ? -m.amountMinor : 0,
  );
}

/** Whether a day's total means anything: it holds a transaction or money in or out of the account. */
export function dayHasTotal(rows: readonly object[]): boolean {
  return rows.some((row) => !('jarId' in row) && !('flow' in row && row.flow === 'between'));
}

function mergeIntoDays<
  T extends { createdAt: string },
  M extends { date: CalendarDate; createdAt: string },
>(
  groups: readonly DayGroup<T>[],
  moves: readonly M[],
  totalOf: (move: M) => number,
): DayGroup<T | M>[] {
  const byDate = new Map<CalendarDate, DayGroup<T | M>>(
    groups.map((g) => [g.date, { ...g, rows: [...g.rows] }]),
  );
  for (const m of moves) {
    const day = byDate.get(m.date);
    if (day) {
      day.rows.push(m);
      day.totalMinor += totalOf(m);
    } else byDate.set(m.date, { date: m.date, totalMinor: totalOf(m), rows: [m] });
  }
  return [...byDate.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((g) => ({ ...g, rows: g.rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
}

/** "today", "yesterday", or the date to show as "Sat, Oct 24". */
export function dayName(date: CalendarDate, today: CalendarDate): 'today' | 'yesterday' | null {
  if (date === today) return 'today';
  if (date === addDays(today, -1)) return 'yesterday';
  return null;
}

/** Spent in today's calendar month ("October · ₾2,846.30 spent"); adjustments don't count. */
export function monthSpent(transactions: readonly Listed[], today: CalendarDate): number {
  const month = today.slice(0, 7);
  return transactions
    .filter((t) => t.kind === 'expense' && t.source !== 'adjustment' && t.date.startsWith(month))
    .reduce((sum, t) => sum + t.amountMinor, 0);
}

export type HistoryFilter = 'all' | 'spending' | 'income' | 'auto';

/**
 * HistorySearch: matches the name, the category or the amount ("coffee",
 * "Fresh", "64.2"), then the chip. Adjustments only show under All.
 */
export function searchTransactions<T extends Listed & { title: string }>(
  transactions: readonly T[],
  query: string,
  filter: HistoryFilter,
  describe: (t: T) => { category: string; amount: string },
): T[] {
  const q = query.trim().toLowerCase();
  return transactions.filter((t) => {
    if (filter === 'spending' && (t.kind !== 'expense' || t.source === 'adjustment')) return false;
    if (filter === 'income' && (t.kind !== 'income' || t.source === 'adjustment')) return false;
    if (filter === 'auto' && !isAutomatic(t)) return false;
    if (!q) return true;
    const { category, amount } = describe(t);
    return `${t.title} ${category} ${amount}`.toLowerCase().includes(q);
  });
}
