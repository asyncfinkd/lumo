// Categories (#18). A new install starts with the ten below; people can rename,
// restyle, delete and add their own in Profile → Categories. Each one picks an
// icon and a color from the design's sets (ProfileCategoryEdit board).

/** A category's id: one of the defaults below, or a UUID for one someone added. */
export type CategoryId = string;
export type CategoryKind = 'expense' | 'income';

export const CATEGORY_ICONS = [
  'basket',
  'coffee',
  'car',
  'gift',
  'bolt',
  'house',
  'heart',
  'wallet',
  'music',
  'book',
  'paw',
  'shirt',
] as const;
export type CategoryIconKey = (typeof CATEGORY_ICONS)[number];

export const CATEGORY_COLORS = [
  'butter',
  'latte',
  'sky',
  'blush',
  'sage',
  'lilac',
  'coral',
  'mint',
] as const;
export type CategoryColorKey = (typeof CATEGORY_COLORS)[number];

type Default = {
  id: CategoryId;
  name: string;
  icon: CategoryIconKey;
  color: CategoryColorKey;
};

/** The defaults, with the looks the ProfileCategories board gives them. */
export const EXPENSE_CATEGORIES: readonly Default[] = [
  { id: 'coffee', name: 'Coffee', icon: 'coffee', color: 'latte' },
  { id: 'groceries', name: 'Groceries', icon: 'basket', color: 'butter' },
  { id: 'transport', name: 'Getting around', icon: 'car', color: 'sky' },
  { id: 'treats', name: 'Treats', icon: 'gift', color: 'blush' },
  { id: 'bills', name: 'Bills', icon: 'bolt', color: 'sage' },
  { id: 'home', name: 'Home', icon: 'house', color: 'lilac' },
];

export const INCOME_CATEGORIES: readonly Default[] = [
  { id: 'salary', name: 'Salary', icon: 'wallet', color: 'mint' },
  { id: 'freelance', name: 'Freelance', icon: 'book', color: 'sky' },
  { id: 'gift', name: 'Gift', icon: 'gift', color: 'blush' },
  { id: 'refund', name: 'Refund', icon: 'wallet', color: 'butter' },
];

/** Ids whose name is translated (`categories.<id>`) until someone renames them. */
export const DEFAULT_CATEGORY_IDS = new Set(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => c.id),
);

export const CATEGORY_ROWS = [
  ...EXPENSE_CATEGORIES.map((c, i) => ({ ...c, kind: 'expense' as const, sortOrder: i })),
  ...INCOME_CATEGORIES.map((c, i) => ({ ...c, kind: 'income' as const, sortOrder: i })),
];
