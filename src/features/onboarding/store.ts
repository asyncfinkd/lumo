import { create } from 'zustand';
import type { CurrencyCode } from '@/domain/money';
import { BILL_KEYS, type BillKey } from './bills';

// Answers while the user moves through onboarding (UI state, ADR 0002). Nothing
// is written to the database until the last step saves it all at once.

export type BillAnswer = { on: boolean; amount: string };

type OnboardingState = {
  name: string;
  currency: CurrencyCode;
  /** Typed keypad text, e.g. "3800" (ADR 0003: parsed only when saving). */
  income: string;
  payday: number;
  bills: Record<BillKey, BillAnswer>;
  setName: (name: string) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setIncome: (income: string) => void;
  setPayday: (payday: number) => void;
  setBill: (key: BillKey, answer: Partial<BillAnswer>) => void;
  reset: () => void;
};

const noBills = () =>
  Object.fromEntries(BILL_KEYS.map((key) => [key, { on: false, amount: '' }])) as Record<
    BillKey,
    BillAnswer
  >;

const initial = () => ({
  name: '',
  currency: 'GEL' as CurrencyCode,
  income: '0',
  payday: 1,
  bills: noBills(),
});

export const useOnboarding = create<OnboardingState>()((set) => ({
  ...initial(),
  setName: (name) => set({ name }),
  setCurrency: (currency) => set({ currency }),
  setIncome: (income) => set({ income }),
  setPayday: (payday) => set({ payday }),
  setBill: (key, answer) =>
    set((state) => ({ bills: { ...state.bills, [key]: { ...state.bills[key], ...answer } } })),
  reset: () => set(initial()),
}));
