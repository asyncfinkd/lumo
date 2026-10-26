/**
 * @jest-environment node
 */
import { eq } from 'drizzle-orm';
import { CATEGORY_ROWS } from '@/db/categories';
import { categories } from '@/db/schema';
import { deleteAllData, ensureCategories } from '@/db/seed';
import { openTestDb } from '@/db/testing';
import { categoryPalette } from '@/theme';
import { buildCategories, type CategoryRow } from '../categories';

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
