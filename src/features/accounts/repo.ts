// Accounts and transfers (#21): Accounts, NewAccount, EditAccount,
// AccountDelete and AddTransaction-Transfer boards. Takes a `Db` so tests run
// it on the real migrations; screens use the live hooks in ../live.ts.

import { and, asc, desc, eq, or } from 'drizzle-orm';
import { type AccountColor, type AccountId, type AccountKind, KIND_COLOR } from '@/db/accounts';
import { newId as defaultNewId } from '@/db/id';
import {
  accounts,
  incomes,
  jarEntries,
  profile,
  recurringBills,
  transactions,
  transfers,
  type Account,
  type Transfer,
} from '@/db/schema';
import type { Db } from '@/db/types';
import type { CalendarDate } from '@/domain/dates';
import { adjustBalance } from '../profile/repo';

export function accountsQuery(db: Db) {
  return db.select().from(accounts).orderBy(asc(accounts.sortOrder), asc(accounts.createdAt));
}

/** Newest first, as History lists them. */
export function transfersQuery(db: Db) {
  return db.select().from(transfers).orderBy(desc(transfers.date), desc(transfers.occurredAt));
}

export type AccountInput = {
  name: string;
  kind: AccountKind;
  /** Left out, the kind's color (EditAccount). */
  color?: AccountColor;
};

/**
 * "Add account" (NewAccount). "What's in it now" becomes its starting
 * adjustment, so it adds to the total like money that was always there.
 */
export function createAccount(
  db: Db,
  input: AccountInput & { startMinor: number },
  today: CalendarDate,
  newId = defaultNewId,
): Account {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');
  if (!Number.isSafeInteger(input.startMinor) || input.startMinor < 0) {
    throw new RangeError(`Starting amount must be 0 or more minor units, got ${input.startMinor}`);
  }
  return db.transaction((tx) => {
    const last = tx
      .select({ sortOrder: accounts.sortOrder })
      .from(accounts)
      .orderBy(desc(accounts.sortOrder))
      .get();
    const account = tx
      .insert(accounts)
      .values({
        id: newId(),
        name,
        kind: input.kind,
        color: input.color ?? KIND_COLOR[input.kind],
        sortOrder: (last?.sortOrder ?? -1) + 1,
        renamed: true,
      })
      .returning()
      .get();
    if (input.startMinor > 0) adjustBalance(tx, input.startMinor, today, account.id, newId);
    return account;
  });
}

/** "Save" (EditAccount). Renaming Main stops it following the app's language. */
export function updateAccount(db: Db, id: AccountId, input: AccountInput): Account {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');
  const existing = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!existing) throw new Error(`No account ${id}`);
  return db
    .update(accounts)
    .set({
      name,
      kind: input.kind,
      color: input.color ?? existing.color,
      renamed: existing.renamed || name !== existing.name,
    })
    .where(eq(accounts.id, id))
    .returning()
    .get();
}

/** What deleting an account does with its money (AccountDelete). */
export type AccountDeletion = { moveTo: AccountId } | 'delete';

/**
 * Deletes an account (AccountDelete). With `moveTo`, everything in it goes to
 * that account and the total stays the same; transfers between the two
 * disappear, since they'd move money to itself. With `delete`, its
 * transactions and transfers go too, both sides of each move (#21). Bills,
 * incomes and jar money never vanish with it: they move to the first account
 * left. The last account can't be deleted.
 */
export function deleteAccount(db: Db, id: AccountId, how: AccountDeletion): void {
  db.transaction((tx) => {
    const others = accountsQuery(tx)
      .all()
      .filter((a) => a.id !== id);
    if (others.length === 0) throw new Error('The last account can’t be deleted');
    const heir = how === 'delete' ? others[0]!.id : how.moveTo;
    if (!others.some((a) => a.id === heir)) throw new Error(`No account ${heir} to move to`);

    const touches = or(eq(transfers.fromAccountId, id), eq(transfers.toAccountId, id));
    if (how === 'delete') {
      tx.delete(transactions).where(eq(transactions.accountId, id)).run();
      tx.delete(transfers).where(touches).run();
    } else {
      tx.update(transactions).set({ accountId: heir }).where(eq(transactions.accountId, id)).run();
      tx.delete(transfers)
        .where(
          or(
            and(eq(transfers.fromAccountId, id), eq(transfers.toAccountId, heir)),
            and(eq(transfers.fromAccountId, heir), eq(transfers.toAccountId, id)),
          ),
        )
        .run();
      tx.update(transfers)
        .set({ fromAccountId: heir })
        .where(eq(transfers.fromAccountId, id))
        .run();
      tx.update(transfers).set({ toAccountId: heir }).where(eq(transfers.toAccountId, id)).run();
    }
    tx.update(recurringBills)
      .set({ accountId: heir })
      .where(eq(recurringBills.accountId, id))
      .run();
    tx.update(incomes).set({ accountId: heir }).where(eq(incomes.accountId, id)).run();
    tx.update(jarEntries).set({ accountId: heir }).where(eq(jarEntries.accountId, id)).run();
    tx.delete(accounts).where(eq(accounts.id, id)).run();
  });
}

/** How many transactions an account holds ("Used in", AccountDelete). */
export function accountUsage(db: Db, id: AccountId): number {
  return db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.accountId, id))
    .all().length;
}

export type TransferInput = {
  fromAccountId: AccountId;
  toAccountId: AccountId;
  amountMinor: number;
  date: CalendarDate;
  note?: string | null;
  /** The moment it happened; defaults to now. */
  occurredAt?: Date;
};

function assertTransfer(input: TransferInput) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new RangeError(`Amount must be more than 0 minor units, got ${input.amountMinor}`);
  }
  if (input.fromAccountId === input.toAccountId) {
    throw new Error('A transfer needs two different accounts');
  }
}

/** "Move money" (AddTransaction-Transfer). Not spending, not income. */
export function addTransfer(db: Db, input: TransferInput, newId = defaultNewId): Transfer {
  assertTransfer(input);
  const me = db.select({ currency: profile.currency }).from(profile).get();
  if (!me) throw new Error('No profile yet');
  return db
    .insert(transfers)
    .values({
      id: newId(),
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amountMinor: input.amountMinor,
      currency: me.currency,
      date: input.date,
      occurredAt: (input.occurredAt ?? new Date()).toISOString(),
      note: input.note ?? null,
    })
    .returning()
    .get();
}

/** "Save" on a transfer (TransactionDetail-Transfer → Edit). */
export function updateTransfer(db: Db, id: string, input: TransferInput): Transfer {
  assertTransfer(input);
  const existing = db.select().from(transfers).where(eq(transfers.id, id)).get();
  if (!existing) throw new Error(`No transfer ${id}`);
  return db
    .update(transfers)
    .set({
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amountMinor: input.amountMinor,
      date: input.date,
      occurredAt: (input.occurredAt ?? new Date(existing.occurredAt)).toISOString(),
      note: input.note ?? null,
    })
    .where(eq(transfers.id, id))
    .returning()
    .get();
}

/** "Delete this move?": the money goes back where it came from. */
export function deleteTransfer(db: Db, id: string): void {
  db.delete(transfers).where(eq(transfers.id, id)).run();
}
