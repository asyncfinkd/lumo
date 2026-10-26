// The fixed v1 categories (#1, MVP scope). Custom categories come later (#18).
// Colors and icons live in the theme, keyed by these ids.

export const EXPENSE_CATEGORIES = [
  { id: 'coffee', name: 'Coffee' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'transport', name: 'Getting around' },
  { id: 'treats', name: 'Treats' },
  { id: 'bills', name: 'Bills' },
  { id: 'home', name: 'Home' },
] as const;

export const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salary' },
  { id: 'freelance', name: 'Freelance' },
  { id: 'gift', name: 'Gift' },
  { id: 'refund', name: 'Refund' },
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]['id'];
export type IncomeCategoryId = (typeof INCOME_CATEGORIES)[number]['id'];
export type CategoryId = ExpenseCategoryId | IncomeCategoryId;

export const CATEGORY_ROWS = [
  ...EXPENSE_CATEGORIES.map((c, i) => ({ ...c, kind: 'expense' as const, sortOrder: i })),
  ...INCOME_CATEGORIES.map((c, i) => ({ ...c, kind: 'income' as const, sortOrder: i })),
];
