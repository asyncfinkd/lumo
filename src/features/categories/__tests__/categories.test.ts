/**
 * @jest-environment node
 */
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { CATEGORY_ROWS } from '@/db/categories';
import { budgets, categories, recurringBills, transactions } from '@/db/schema';
import { deleteAllData, ensureCategories } from '@/db/seed';
import { openTestDb } from '@/db/testing';
import { categoryPalette } from '@/theme';
import { saveBudget } from '../../budgets/repo';
import { saveProfile } from '../../profile/repo';
import { saveBill } from '../../recurring/repo';
import { addTransaction } from '../../transactions/repo';
import { buildCategories, type CategoryRow } from '../categories';
import { categoryUsage, deleteCategory, saveCategory } from '../repo';

const t = (key: string) => `t:${key}`;
const rows: CategoryRow[] = CATEGORY_ROWS.map((c) => ({ ...c, renamed: false }));

describe('buildCategories', () => {
  it('translates defaults and keeps what people renamed or added', () => {
    const lookup = buildCategories(
      [
        ...rows.map((r) => (r.id === 'coffee' ? { ...r, name: 'Cafés', renamed: true } : r)),
        {
          id: 'pets-1',
          kind: 'expense',
          name: 'Pets',
          icon: 'paw',
          color: 'coral',
          renamed: false,
          sortOrder: 6,
        },
      ],
      t,
    );
    expect(lookup.get('groceries').label).toBe('t:categories.groceries');
    expect(lookup.get('coffee').label).toBe('Cafés');
    expect(lookup.get('pets-1')).toMatchObject({
      label: 'Pets',
      icon: 'paw',
      tint: categoryPalette.coral,
    });
  });

  it('lists spending first, each kind in its order', () => {
    const lookup = buildCategories([...rows].reverse(), t);
    expect(lookup.list.map((c) => c.id)).toEqual(CATEGORY_ROWS.map((c) => c.id));
    expect(lookup.ofKind('income').map((c) => c.id)).toEqual([
      'salary',
      'freelance',
      'gift',
      'refund',
    ]);
  });

  it('shows "No category" for none or one that was deleted', () => {
    const lookup = buildCategories(rows, t);
    expect(lookup.get(null)).toMatchObject({ id: null, label: 't:categories.none', icon: 'none' });
    expect(lookup.get('gone').id).toBeNull();
  });

  it('falls back to a known icon and color for unknown values', () => {
    const lookup = buildCategories([{ ...rows[0]!, icon: 'rocket', color: 'neon' }], t);
    expect(lookup.get(rows[0]!.id)).toMatchObject({ icon: 'basket', color: 'butter' });
  });
});

describe('default categories in the database', () => {
  it('fills an empty table with the ten defaults, looks included', () => {
    const db = openTestDb();
    ensureCategories(db);
    expect(db.select().from(categories).all()).toHaveLength(10);
    expect(db.select().from(categories).where(eq(categories.id, 'treats')).get()).toMatchObject({
      icon: 'gift',
      color: 'blush',
    });
  });

  it("doesn't bring back a default someone deleted", () => {
    const db = openTestDb();
    ensureCategories(db);
    db.delete(categories).where(eq(categories.id, 'coffee')).run();
    ensureCategories(db);
    expect(db.select().from(categories).where(eq(categories.id, 'coffee')).get()).toBeUndefined();
  });

  it('goes back to the defaults when all data is deleted', () => {
    const db = openTestDb();
    ensureCategories(db);
    db.delete(categories).where(eq(categories.id, 'coffee')).run();
    db.insert(categories)
      .values({
        id: 'pets-1',
        kind: 'expense',
        name: 'Pets',
        icon: 'paw',
        color: 'coral',
        sortOrder: 6,
      })
      .run();
    deleteAllData(db);
    const ids = db
      .select({ id: categories.id })
      .from(categories)
      .all()
      .map((r) => r.id);
    expect(ids.sort()).toEqual(CATEGORY_ROWS.map((c) => c.id).sort());
  });
});

describe('managing categories', () => {
  // A profile, Coffee in use and budgeted, and a bill on Bills.
  function setup() {
    const db = openTestDb();
    ensureCategories(db);
    saveProfile(db, { name: 'Nika', currency: 'GEL', payday: 5 }, randomUUID);
    addTransaction(
      db,
      {
        kind: 'expense',
        amountMinor: 1150,
        categoryId: 'coffee',
        title: 'Lab',
        date: '2026-10-31',
      },
      randomUUID,
    );
    addTransaction(
      db,
      { kind: 'expense', amountMinor: 900, categoryId: 'coffee', title: 'Cup', date: '2026-10-30' },
      randomUUID,
    );
    saveBudget(
      db,
      { categoryId: 'coffee', limitMinor: 32000, nudgeEnabled: true, nudgeAtMinor: null },
      randomUUID,
    );
    saveBill(
      db,
      { name: 'Coffee club', amountMinor: 2000, day: 10, categoryId: 'coffee' },
      randomUUID,
    );
    return db;
  }

  it('adds a category at the end of its kind', () => {
    const db = setup();
    const id = saveCategory(
      db,
      { name: ' Pets ', kind: 'expense', icon: 'paw', color: 'coral' },
      () => 'pets-1',
    );
    expect(db.select().from(categories).where(eq(categories.id, id)).get()).toMatchObject({
      name: 'Pets',
      sortOrder: 6,
      icon: 'paw',
      color: 'coral',
      renamed: false,
    });
  });

  it('marks a renamed default so it keeps its new name', () => {
    const db = setup();
    saveCategory(db, {
      id: 'coffee',
      name: 'Cafés',
      kind: 'expense',
      icon: 'coffee',
      color: 'latte',
      renamed: true,
    });
    expect(db.select().from(categories).where(eq(categories.id, 'coffee')).get()).toMatchObject({
      name: 'Cafés',
      renamed: true,
    });
  });

  it('refuses an empty name', () => {
    expect(() =>
      saveCategory(setup(), { name: '  ', kind: 'expense', icon: 'paw', color: 'coral' }),
    ).toThrow(RangeError);
  });

  it('counts what uses a category', () => {
    expect(categoryUsage(setup(), 'coffee')).toBe(2);
  });

  it('deletes and moves transactions and bills, and drops the budget', () => {
    const db = setup();
    deleteCategory(db, 'coffee', 'treats');
    expect(categoryUsage(db, 'treats')).toBe(2);
    expect(db.select().from(recurringBills).get()!.categoryId).toBe('treats');
    expect(db.select().from(budgets).all()).toHaveLength(0);
    expect(db.select().from(categories).where(eq(categories.id, 'coffee')).get()).toBeUndefined();
  });

  it('can leave them with no category', () => {
    const db = setup();
    deleteCategory(db, 'coffee', null);
    expect(
      db
        .select()
        .from(transactions)
        .all()
        .every((t) => t.categoryId === null),
    ).toBe(true);
    expect(db.select().from(recurringBills).get()!.categoryId).toBeNull();
  });
});
