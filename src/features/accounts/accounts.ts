// Every screen reads accounts from here (#21): the rows, turned into what's
// drawn — Main's name in the app's language until it's renamed, the tint, and
// what each one holds right now.

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type AccountColor, type AccountKind, MAIN_ACCOUNT_ID } from '@/db/accounts';
import type { Account } from '@/db/schema';
import { accountBalances } from '@/domain/balance';
import { categoryPalette } from '@/theme';
import { useAccountTotals, useAccounts } from '../live';

export type AccountView = {
  id: string;
  /** The name to show: Main translated until someone renames it. */
  label: string;
  kind: AccountKind;
  color: AccountColor;
  tint: (typeof categoryPalette)[AccountColor];
  /** What it holds now, minor units. */
  balanceMinor: number;
};

/** Main follows the app's language until it's renamed, like a default category. */
export function accountLabel(
  account: Pick<Account, 'id' | 'name' | 'renamed'>,
  mainLabel: string,
): string {
  return account.id === MAIN_ACCOUNT_ID && !account.renamed ? mainLabel : account.name;
}

/** Accounts in their order, with what each holds. */
export function useAccountViews(): AccountView[] {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const { transactions, jarEntries, transfers } = useAccountTotals();
  return useMemo(() => {
    const balances = accountBalances(
      accounts.map((a) => a.id),
      transactions,
      jarEntries,
      transfers,
    );
    const main = t('accounts.main');
    return accounts.map((a) => ({
      id: a.id,
      label: accountLabel(a, main),
      kind: a.kind,
      color: a.color,
      tint: categoryPalette[a.color],
      balanceMinor: balances.get(a.id) ?? 0,
    }));
  }, [accounts, transactions, jarEntries, transfers, t]);
}
