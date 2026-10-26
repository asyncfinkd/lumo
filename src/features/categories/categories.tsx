// Every screen reads categories from here (#18): the rows in the database,
// turned into what's drawn — the name in the app's language, the icon and the
// colors. CategoriesProvider runs one live query for the whole app.

import { createContext, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_ROWS,
  type CategoryColorKey,
  type CategoryIconKey,
  type CategoryId,
  type CategoryKind,
  DEFAULT_CATEGORY_IDS,
} from '@/db/categories';
import { categoryPalette, noCategoryColors } from '@/theme';

export type CategoryRow = {
  id: string;
  kind: CategoryKind;
  name: string;
  icon: string;
  color: string;
  renamed: boolean;
  sortOrder: number;
};

export type CategoryView = {
  id: CategoryId | null;
  kind: CategoryKind;
  /** The name to show: translated for a default nobody renamed. */
  label: string;
  icon: CategoryIconKey | 'none';
  color: CategoryColorKey | null;
  tint: (typeof categoryPalette)[CategoryColorKey];
};

export type Categories = {
  /** In their order, spending first. */
  list: CategoryView[];
  ofKind: (kind: CategoryKind) => CategoryView[];
  /** A category by id; "No category" for null or one that's gone. */
  get: (id: CategoryId | null | undefined) => CategoryView;
};

const isIcon = (v: string): v is CategoryIconKey =>
  (CATEGORY_ICONS as readonly string[]).includes(v);
const isColor = (v: string): v is CategoryColorKey =>
  (CATEGORY_COLORS as readonly string[]).includes(v);

/** Pure: rows → the lookup. Exported for tests. */
export function buildCategories(
  rows: readonly CategoryRow[],
  t: (key: string) => string,
): Categories {
  const list = [...rows]
    .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === 'expense' ? -1 : 1))
    .map((row): CategoryView => {
      const color = isColor(row.color) ? row.color : 'butter';
      return {
        id: row.id,
        kind: row.kind,
        label:
          DEFAULT_CATEGORY_IDS.has(row.id) && !row.renamed ? t(`categories.${row.id}`) : row.name,
        icon: isIcon(row.icon) ? row.icon : 'basket',
        color,
        tint: categoryPalette[color],
      };
    });
  const byId = new Map(list.map((c) => [c.id, c]));
  const none: CategoryView = {
    id: null,
    kind: 'expense',
    label: t('categories.none'),
    icon: 'none',
    color: null,
    tint: noCategoryColors,
  };
  return {
    list,
    ofKind: (kind) => list.filter((c) => c.kind === kind),
    get: (id) => (id ? (byId.get(id) ?? none) : none),
  };
}

const DEFAULT_ROWS: CategoryRow[] = CATEGORY_ROWS.map((c) => ({ ...c, renamed: false }));
/** Filled by CategoriesProvider; without it (tests, previews) the defaults are used. */
export const CategoryRowsContext = createContext<readonly CategoryRow[] | null>(null);

export function useCategories(): Categories {
  const { t } = useTranslation();
  const rows = useContext(CategoryRowsContext) ?? DEFAULT_ROWS;
  return useMemo(() => buildCategories(rows, t as (key: string) => string), [rows, t]);
}
