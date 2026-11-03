import { asc } from 'drizzle-orm';
import { type AccountId, MAIN_ACCOUNT_ID } from './accounts';
import { accounts } from './schema';
import type { Db } from './types';

/**
 * Where money lands when nothing says which account (#21): the first one in
 * the list. That's Main until someone deletes it, so writes never point at
 * an account that's gone.
 */
export function defaultAccountId(db: Db): AccountId {
  const first = db
    .select({ id: accounts.id })
    .from(accounts)
    .orderBy(asc(accounts.sortOrder), asc(accounts.createdAt))
    .get();
  return first?.id ?? MAIN_ACCOUNT_ID;
}
