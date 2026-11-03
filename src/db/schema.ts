// SQLite schema for v1 (#33). Data never leaves the device (ADR 0001); money is
// integer minor units with its currency next to it (ADR 0003).
//
// After changing this file run `npm run db:generate` and commit the new migration.

import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { ACCOUNT_COLORS, ACCOUNT_KINDS, MAIN_ACCOUNT_ID } from './accounts';

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
  /** Which reminders are on (ProfileReminders); `reminders` is the main switch. */
  remindBills: integer('remind_bills', { mode: 'boolean' }).notNull().default(true),
  remindPayday: integer('remind_payday', { mode: 'boolean' }).notNull().default(true),
  remindLowBudget: integer('remind_low_budget', { mode: 'boolean' }).notNull().default(true),
  remindEvening: integer('remind_evening', { mode: 'boolean' }).notNull().default(false),
  /** The eye on Home's balance card: amounts blurred until shown again (Main). */
  hideAmounts: integer('hide_amounts', { mode: 'boolean' }).notNull().default(false),
  /** Face ID / Touch ID / fingerprint each time Lumo opens (ProfileLockFaceID, #24). */
  appLock: integer('app_lock', { mode: 'boolean' }).notNull().default(false),
  /** The app's language (ProfileLanguage); `null` follows the phone's. */
  language: text('language', { enum: ['en', 'ka'] }),
});

/** The fixed v1 set from the design: 6 expense and 4 income categories. */
/** The defaults plus any the person added (#18). See src/db/categories.ts. */
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  /** One of CATEGORY_ICONS. */
  icon: text('icon').notNull().default('basket'),
  /** One of CATEGORY_COLORS. */
  color: text('color').notNull().default('butter'),
  /** A default keeps its translated name until it's renamed. */
  renamed: integer('renamed', { mode: 'boolean' }).notNull().default(false),
});

/** Where money sits: Cash, a debit card (#21). See src/db/accounts.ts. */
export const accounts = sqliteTable('accounts', {
  ...base,
  name: text('name').notNull(),
  kind: text('kind', { enum: ACCOUNT_KINDS }).notNull(),
  color: text('color', { enum: ACCOUNT_COLORS }).notNull(),
  sortOrder: integer('sort_order').notNull(),
  /** Main keeps its translated name until it's renamed, like a default category. */
  renamed: integer('renamed', { mode: 'boolean' }).notNull().default(false),
});

/**
 * The account a row's money is in. Rows from before accounts, and rows written
 * without one, are Main's (#21).
 */
const accountId = text('account_id')
  .notNull()
  .default(MAIN_ACCOUNT_ID)
  .references(() => accounts.id);

export const transactions = sqliteTable(
  'transactions',
  {
    ...base,
    kind: text('kind', { enum: ['income', 'expense'] }).notNull(),
    ...money,
    accountId,
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
    /** `null` once its category was deleted with "No category" (#18). */
    categoryId: text('category_id').references(() => categories.id),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    /** "Remind me a day before" (ProfileBillEdit). */
    remind: integer('remind', { mode: 'boolean' }).notNull().default(true),
    /** Where its payments come from. */
    accountId,
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
    /** Where it's paid in. */
    accountId,
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

/** A savings jar (Savings, SavingsNew). Its money is in `jarEntries`. */
export const jars = sqliteTable(
  'jars',
  {
    ...base,
    name: text('name').notNull(),
    /** The jar's color (SavingsNew): Honey, Sky, Blush or Sage. */
    tone: text('tone', { enum: ['gold', 'sky', 'blush', 'sage'] }).notNull(),
    goalMinor: integer('goal_minor').notNull(),
    /**
     * "Each day" or "Each month": the plan the pace line is measured against.
     * The column kept its first name from when every jar was monthly.
     */
    planMinor: integer('monthly_minor').notNull(),
    cadence: text('cadence', { enum: ['day', 'month'] })
      .notNull()
      .default('month'),
    currency: text('currency', { enum: currencyCodes }).notNull(),
    /** Local date it was made: month 0 of the plan. */
    startDate: text('start_date').notNull(),
    /** "Remind me" at this local time, "22:00"; `null` when off. */
    remindAt: text('remind_at'),
    /** Set by "Time to treat yourself" (SavingsDone); the money went back. */
    closedAt: text('closed_at'),
  },
  (t) => [
    check('jars_goal_positive', sql`${t.goalMinor} > 0`),
    check('jars_monthly_positive', sql`${t.planMinor} > 0`),
  ],
);

/**
 * Money moved into a jar (+) or back out (−). It leaves the balance on Home
 * but isn't a transaction: History lists it (HistoryJars), but Went out,
 * budgets and Insights' spending never count it.
 */
export const jarEntries = sqliteTable(
  'jar_entries',
  {
    ...base,
    jarId: text('jar_id')
      .notNull()
      .references(() => jars.id),
    /** Positive into the jar, negative out of it. */
    amountMinor: integer('amount_minor').notNull(),
    date: text('date').notNull(),
    /** The account it came out of, or went back into (SavingsAdd). */
    accountId,
  },
  (t) => [index('jar_entries_jar_idx').on(t.jarId)],
);

/**
 * Money moved between two accounts (AddTransaction-Transfer). Not spending and
 * not income: it never reaches budgets, Insights or Came in / Went out, and the
 * total balance stays the same.
 */
export const transfers = sqliteTable(
  'transfers',
  {
    ...base,
    fromAccountId: text('from_account_id')
      .notNull()
      .references(() => accounts.id),
    toAccountId: text('to_account_id')
      .notNull()
      .references(() => accounts.id),
    ...money,
    date: text('date').notNull(),
    /** The exact moment, ISO 8601, as on transactions. */
    occurredAt: text('occurred_at').notNull(),
    note: text('note'),
  },
  (t) => [
    index('transfers_date_idx').on(t.date),
    check('transfers_amount_positive', sql`${t.amountMinor} > 0`),
    check('transfers_two_accounts', sql`${t.fromAccountId} <> ${t.toAccountId}`),
  ],
);

export type Profile = typeof profile.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type RecurringBill = typeof recurringBills.$inferSelect;
export type Income = typeof incomes.$inferSelect;
export type Jar = typeof jars.$inferSelect;
export type JarEntry = typeof jarEntries.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
