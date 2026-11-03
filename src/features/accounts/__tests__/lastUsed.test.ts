import { lastJarAccount, lastUsedAccount } from '../lastUsed';

const tx = (
  accountId: string,
  createdAt: string,
  kind: 'expense' | 'income' = 'expense',
  source: 'manual' | 'bill' | 'adjustment' = 'manual',
) => ({ accountId, createdAt, kind, source });

describe('lastUsedAccount', () => {
  const ids = ['main', 'cash'];

  it('starts on the account used last for that kind', () => {
    const list = [
      tx('main', '2026-11-01T10:00:00Z'),
      tx('cash', '2026-11-02T10:00:00Z'),
      tx('main', '2026-11-03T10:00:00Z', 'income'),
    ];
    expect(lastUsedAccount(list, 'expense', ids)).toBe('cash');
    expect(lastUsedAccount(list, 'income', ids)).toBe('main');
  });

  it('only counts what you added yourself', () => {
    const list = [
      tx('main', '2026-11-01T10:00:00Z'),
      tx('cash', '2026-11-02T10:00:00Z', 'expense', 'bill'),
      tx('cash', '2026-11-03T10:00:00Z', 'expense', 'adjustment'),
    ];
    expect(lastUsedAccount(list, 'expense', ids)).toBe('main');
  });

  it('falls back to the first account when there is none, or it is gone', () => {
    expect(lastUsedAccount([], 'expense', ids)).toBe('main');
    expect(lastUsedAccount([tx('old', '2026-11-03T10:00:00Z')], 'expense', ids)).toBe('main');
    expect(lastUsedAccount([], 'expense', [])).toBeUndefined();
  });
});

describe('lastJarAccount', () => {
  const ids = ['main', 'cash'];
  const entry = (jarId: string, amountMinor: number, accountId: string, createdAt: string) => ({
    jarId,
    amountMinor,
    accountId,
    createdAt,
  });
  const entries = [
    entry('trip', 10000, 'cash', '2026-11-01T10:00:00Z'),
    entry('trip', -5000, 'main', '2026-11-02T10:00:00Z'),
    entry('laptop', 10000, 'main', '2026-11-03T10:00:00Z'),
  ];

  it('uses the account last used for this jar, the same way', () => {
    expect(lastJarAccount(entries, 'trip', false, ids)).toBe('cash');
    expect(lastJarAccount(entries, 'trip', true, ids)).toBe('main');
  });

  it('falls back to the first account', () => {
    expect(lastJarAccount(entries, 'new', false, ids)).toBe('main');
    expect(lastJarAccount(entries, 'trip', false, ['main'])).toBe('main');
  });
});
