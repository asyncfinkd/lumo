import type { ExpenseCategoryId } from '@/db/categories';

/** The design's emoji for each expense category, at the end of friendly lines. */
export const CATEGORY_EMOJI: Record<ExpenseCategoryId, string> = {
  coffee: '☕',
  groceries: '🧺',
  transport: '🚲',
  treats: '🍰',
  bills: '💡',
  home: '🏡',
};
