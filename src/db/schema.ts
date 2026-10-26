// SQLite schema for v1 (#33). Data never leaves the device (ADR 0001); money is
// integer minor units with its currency next to it (ADR 0003).
//
// After changing this file run `npm run db:generate` and commit the new migration.

import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const currencyCodes = ['GEL', 'USD', 'EUR', 'GBP', 'TRY', 'AMD', 'AZN', 'UAH'] as const;
const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

// Every row: a UUID and when it was created and last changed. IDs come from
// `newId()` (src/db/id.ts) where rows are created: this file is also loaded by
// drizzle-kit in plain Node, so it can't import Expo modules.
const base = {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at')
    .notNull()
    .default(now)
    .$onUpdate(() => new Date().toISOString()),
};

const money = {
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency', { enum: currencyCodes }).notNull(),
};

/** One row: the person using the app. */
export const profile = sqliteTable('profile', {
  ...base,
  name: text('name').notNull(),
  currency: text('currency', { enum: currencyCodes }).notNull(),
  /** Day of the month the pay period starts, 1–31 (#2). */
  payday: integer('payday').notNull(),
  onboardedAt: text('onboarded_at'),
  /** Background of the initial when there's no photo (ProfilePhotoSheet). */
  avatarColor: text('avatar_color', {
    enum: ['butter', 'peach', 'blush', 'lilac', 'sky', 'sage'],
  })
    .notNull()
    .default('butter'),
  /** The cropped profile photo, a file in the app's document directory. */
  photoUri: text('photo_uri'),
  /** The Reminders switch in Profile. */
  reminders: integer('reminders', { mode: 'boolean' }).notNull().default(true),
});

/** The fixed v1 set from the design: 6 expense and 4 income categories. */
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const transactions = sqliteTable(
  'transactions',
  {
    ...base,
    kind: text('kind', { enum: ['income', 'expense'] }).notNull(),
    ...money,
    categoryId: text('category_id').references(() => categories.id),
    title: text('title').notNull(),
    note: text('note'),
    /** Local calendar date, YYYY-MM-DD: what periods and lists group by. */
    date: text('date').notNull(),
    /** The exact moment, ISO 8601, for the time shown in lists ("8:40"). */
    occurredAt: text('occurred_at').notNull(),
    /** Only `manual` counts as spending or extra income (#2, #6). */
    source: text('source', {
      enum: ['manual', 'bill', 'recurring_income', 'adjustment'],
    }).notNull(),
    /** The bill or income that created it, so it's never created twice (#4). */
    recurringId: text('recurring_id'),
  },
  (t) => [
    index('transactions_date_idx').on(t.date),
    uniqueIndex('transactions_recurring_date_idx').on(t.recurringId, t.date),
    check('transactions_amount_positive', sql`${t.amountMinor} >= 0`),
  ],
);

export const budgets = sqliteTable(
  'budgets',
  {
    ...base,
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    limitMinor: integer('limit_minor').notNull(),
    currency: text('currency', { enum: currencyCodes }).notNull(),
    nudgeEnabled: integer('nudge_enabled', { mode: 'boolean' }).notNull().default(true),
    /** "Nudge me when ₾50 is left". */
    nudgeAtMinor: integer('nudge_at_minor'),
  },
  (t) => [
    uniqueIndex('budgets_category_idx').on(t.categoryId),
    check('budgets_limit_positive', sql`${t.limitMinor} >= 0`),
  ],
);

export const recurringBills = sqliteTable(
  'recurring_bills',
  {
    ...base,
    name: text('name').notNull(),
    ...money,
    /** Day of the month it's due, 1–31; short months use their last day. */
    day: integer('day').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => [
    check('recurring_bills_day', sql`${t.day} BETWEEN 1 AND 31`),
    check('recurring_bills_amount_positive', sql`${t.amountMinor} >= 0`),
  ],
);

export const incomes = sqliteTable(
  'incomes',
  {
    ...base,
    name: text('name').notNull(),
    ...money,
    /** Payday, 1–31. */
    day: integer('day').notNull(),
  },
  (t) => [
    check('incomes_day', sql`${t.day} BETWEEN 1 AND 31`),
    check('incomes_amount_positive', sql`${t.amountMinor} >= 0`),
  ],
);

/**
 * A bill or salary payment the user deleted (#50). `syncDueTransactions` treats
 * it as already done, so it never comes back.
 */
export const skippedOccurrences = sqliteTable(
  'skipped_occurrences',
  {
    ...base,
    recurringId: text('recurring_id').notNull(),
    date: text('date').notNull(),
  },
  (t) => [uniqueIndex('skipped_occurrences_idx').on(t.recurringId, t.date)],
);

export type Profile = typeof profile.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type RecurringBill = typeof recurringBills.$inferSelect;
export type Income = typeof incomes.$inferSelect;
