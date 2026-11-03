// Accounts (#21): where money sits, like Cash or a debit card. Everyone starts
// with one, Main, which holds everything from before accounts existed. With
// only Main the app looks as it did; Profile → Accounts adds more (EditAccount
// board).

export type AccountId = string;

/** Cash and debit cards for now; no credit cards (#21). */
export const ACCOUNT_KINDS = ['cash', 'debit'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/** The EditAccount board's Color row. */
export const ACCOUNT_COLORS = ['sage', 'sky', 'blush', 'lilac', 'butter', 'latte'] as const;
export type AccountColor = (typeof ACCOUNT_COLORS)[number];

/** The tint a new account starts with for its kind (EditAccount). */
export const KIND_COLOR: Record<AccountKind, AccountColor> = { cash: 'sage', debit: 'sky' };

/**
 * The first account. Its id is fixed: every transaction, bill, income and jar
 * move that existed before accounts belongs to it (migration 0012), and a
 * restored backup from before accounts lands in it too.
 */
export const MAIN_ACCOUNT_ID: AccountId = 'main';

export const MAIN_ACCOUNT = {
  id: MAIN_ACCOUNT_ID,
  name: 'Main',
  kind: 'debit',
  color: 'latte',
  sortOrder: 0,
} as const satisfies {
  id: AccountId;
  name: string;
  kind: AccountKind;
  color: AccountColor;
  sortOrder: number;
};
