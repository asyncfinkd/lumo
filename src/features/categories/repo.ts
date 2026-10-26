// Adding, changing and deleting categories (#18, Profile → Categories).

import { count, eq, max } from 'drizzle-orm';
import type { CategoryColorKey, CategoryIconKey, CategoryId, CategoryKind } from '@/db/categories';
import { newId as defaultNewId } from '@/db/id';
import { budgets, categories, recurringBills, transactions } from '@/db/schema';
import type { Db } from '@/db/types';

export type CategoryInput = {
  name: string;
  kind: CategoryKind;
  icon: CategoryIconKey;
  color: CategoryColorKey;
};

/**
 * Creates a category at the end of its kind, or changes one. `renamed` marks a
 * default whose name the person changed, so it stops following the app's
 * language.
 */
export function saveCategory(
  db: Db,
  input: CategoryInput & { id?: CategoryId; renamed?: boolean },
  newId = defaultNewId,
): CategoryId {
  const name = input.name.trim();
  if (!name) throw new RangeError('A category needs a name');

  if (input.id) {
    db.update(categories)
      .set({
        name,
        kind: input.kind,
        icon: input.icon,
        color: input.color,
        ...(input.renamed ? { renamed: true } : {}),
      })
      .where(eq(categories.id, input.id))
      .run();
    return input.id;
  }

  const [last] = db
    .select({ n: max(categories.sortOrder) })
    .from(categories)
    .where(eq(categories.kind, input.kind))
    .all();
  const id = newId();
  db.insert(categories)
    .values({
      id,
      name,
      kind: input.kind,
      icon: input.icon,
      color: input.color,
      sortOrder: (last?.n ?? -1) + 1,
    })
    .run();
  return id;
}

/** How many transactions use a category: "23 transactions use Coffee". */
export function categoryUsage(db: Db, id: CategoryId): number {
  const [row] = db
    .select({ n: count() })
    .from(transactions)
    .where(eq(transactions.categoryId, id))
    .all();
  return row?.n ?? 0;
}

/**
 * Deletes a category. Its transactions and bills move to `moveTo`, or to no
 * category; nothing is lost. Its budget goes (ProfileCategoryDelete).
 */
export function deleteCategory(db: Db, id: CategoryId, moveTo: CategoryId | null): void {
  if (moveTo === id) throw new RangeError("Can't move a category into itself");
  db.transaction((tx) => {
    tx.update(transactions)
      .set({ categoryId: moveTo })
      .where(eq(transactions.categoryId, id))
      .run();
    tx.update(recurringBills)
      .set({ categoryId: moveTo })
      .where(eq(recurringBills.categoryId, id))
      .run();
    tx.delete(budgets).where(eq(budgets.categoryId, id)).run();
    tx.delete(categories).where(eq(categories.id, id)).run();
  });
}
