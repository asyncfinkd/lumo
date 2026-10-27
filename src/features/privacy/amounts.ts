// "Hide amounts" (the eye on Home's balance card, Main): every amount shows
// as "••••" until shown again; the sign and the currency stay ("−₾••••"). The
// choice is saved on the profile, so it stays after a restart.

import { createContext, useCallback, useContext } from 'react';

/** Filled from the profile in the root layout. */
export const AmountsHiddenContext = createContext(false);

export function useAmountsHidden(): boolean {
  return useContext(AmountsHiddenContext);
}

export const MASK = '••••';

/** "−₾64.20" → "−₾••••", "₾2,846.30 spent" → "₾•••• spent": the first number goes. */
export function maskAmount(text: string): string {
  return text.replace(/\d[\d.,\s]*\d|\d/, MASK);
}

/** Masks amounts while they're hidden, passes them through otherwise. */
export function useMoneyText(): (text: string) => string {
  const hidden = useAmountsHidden();
  return useCallback((text: string) => (hidden ? maskAmount(text) : text), [hidden]);
}
