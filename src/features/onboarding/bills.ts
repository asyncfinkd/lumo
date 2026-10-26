import type { CategoryId } from '@/db/categories';

// The monthly bills onboarding offers (OBBills), in the design's order, and the
// category each one counts toward (#4: rent is Home, the rest are Bills).
export const BILL_KEYS = [
  'rent',
  'utilities',
  'internet',
  'phone',
  'gym',
  'insurance',
  'netflix',
  'spotify',
  'other',
] as const;

export type BillKey = (typeof BILL_KEYS)[number];

export const billCategory: Record<BillKey, CategoryId> = {
  rent: 'home',
  utilities: 'bills',
  internet: 'bills',
  phone: 'bills',
  gym: 'bills',
  insurance: 'bills',
  netflix: 'bills',
  spotify: 'bills',
  other: 'bills',
};

/**
 * The decimal keypad shows a comma in many locales (Georgian included): treat it
 * as the decimal point, and keep only digits and one point.
 */
export function cleanAmount(typed: string): string {
  const [whole = '', ...rest] = typed
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '')
    .split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}
