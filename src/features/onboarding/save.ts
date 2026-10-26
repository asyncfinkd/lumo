// Writes all onboarding answers in one go, at "Looks good" on Your month.

import { newId as defaultNewId } from '@/db/id';
import type { Db } from '@/db/types';
import { type CurrencyCode, parseAmount } from '@/domain/money';
import { markOnboarded, saveProfile } from '../profile/repo';
import { saveBill, saveIncome } from '../recurring/repo';
import { BILL_KEYS, billCategory, type BillKey } from './bills';
import type { BillAnswer } from './store';

export type OnboardingAnswers = {
  name: string;
  currency: CurrencyCode;
  income: string;
  payday: number;
  bills: Record<BillKey, BillAnswer>;
};

/** Bills the user turned on with an amount above 0, in minor units. */
export function chosenBills(answers: Pick<OnboardingAnswers, 'bills' | 'currency'>) {
  return BILL_KEYS.flatMap((key) => {
    const answer = answers.bills[key];
    if (!answer.on) return [];
    const amountMinor = parseAmount(answer.amount.replace(/\s/g, ''), answers.currency);
    return amountMinor && amountMinor > 0 ? [{ key, amountMinor }] : [];
  });
}

/**
 * Saves profile, income and bills, then marks onboarding done. `billName`
 * turns a bill key into the name shown in the app ("Rent"). Bills are due on
 * payday until the user changes their day in Profile.
 */
export function saveOnboarding(
  db: Db,
  answers: OnboardingAnswers,
  billName: (key: BillKey) => string,
  incomeName: string,
  newId = defaultNewId,
): void {
  const incomeMinor = parseAmount(answers.income, answers.currency);
  if (!incomeMinor || incomeMinor <= 0) throw new RangeError('Income must be above 0');

  db.transaction((tx) => {
    saveProfile(
      tx,
      { name: answers.name, currency: answers.currency, payday: answers.payday },
      newId,
    );
    saveIncome(tx, { name: incomeName, amountMinor: incomeMinor, day: answers.payday }, newId);
    for (const bill of chosenBills(answers)) {
      saveBill(
        tx,
        {
          name: billName(bill.key),
          amountMinor: bill.amountMinor,
          day: answers.payday,
          categoryId: billCategory[bill.key],
        },
        newId,
      );
    }
    markOnboarded(tx);
  });
}
