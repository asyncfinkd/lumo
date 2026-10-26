import { eq } from 'drizzle-orm';
import type { CategoryId } from '@/db/categories';
import { newId as defaultNewId } from '@/db/id';
import { budgets, profile, type Budget } from '@/db/schema';
import type { Db } from '@/db/types';

export function budgetsQuery(db: Db) {
  return db.select().from(budgets);
}

export function getBudget(db: Db, categoryId: CategoryId): Budget | undefined {
  return db.select().from(budgets).where(eq(budgets.categoryId, categoryId)).get();
}

export type BudgetInput = {
  categoryId: CategoryId;
  limitMinor: number;
  nudgeEnabled: boolean;
  nudgeAtMinor: number | null;
};

/** One budget per category: creates it the first time, updates it after. */
export function saveBudget(db: Db, input: BudgetInput, newId = defaultNewId): Budget {
  if (!Number.isSafeInteger(input.limitMinor) || input.limitMinor < 0) {
    throw new RangeError(`Budget limit must be 0 or more minor units, got ${input.limitMinor}`);
  }
  const me = db.select({ currency: profile.currency }).from(profile).get();
  if (!me) throw new Error('No profile yet');
  const values = {
    limitMinor: input.limitMinor,
    nudgeEnabled: input.nudgeEnabled,
    nudgeAtMinor: input.nudgeAtMinor,
    currency: me.currency,
  };
  return db
    .insert(budgets)
    .values({ id: newId(), categoryId: input.categoryId, ...values })
    .onConflictDoUpdate({ target: budgets.categoryId, set: values })
    .returning()
    .get();
}

export function deleteBudget(db: Db, categoryId: CategoryId): void {
  db.delete(budgets).where(eq(budgets.categoryId, categoryId)).run();
}
