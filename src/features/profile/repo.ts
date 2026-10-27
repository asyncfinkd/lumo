import { eq } from 'drizzle-orm';
import { newId as defaultNewId } from '@/db/id';
import { profile, transactions, type Profile } from '@/db/schema';
import type { Db } from '@/db/types';
import { balanceAdjustment, totalBalance } from '@/domain/balance';
import type { CalendarDate } from '@/domain/dates';
import type { CurrencyCode } from '@/domain/money';
import type { AvatarColor } from '@/theme/color';

export function profileQuery(db: Db) {
  return db.select().from(profile).limit(1);
}

export function getProfile(db: Db): Profile | undefined {
  return profileQuery(db).get();
}

export type ProfileInput = { name: string; currency: CurrencyCode; payday: number };

/** Creates the profile on the first save, updates it after that. */
export function saveProfile(db: Db, input: ProfileInput, newId = defaultNewId): Profile {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');
  if (!Number.isInteger(input.payday) || input.payday < 1 || input.payday > 31) {
    throw new RangeError(`payday must be 1–31, got ${input.payday}`);
  }
  const existing = getProfile(db);
  if (existing) {
    return db
      .update(profile)
      .set({ name, currency: input.currency, payday: input.payday })
      .where(eq(profile.id, existing.id))
      .returning()
      .get();
  }
  return db
    .insert(profile)
    .values({ id: newId(), name, currency: input.currency, payday: input.payday })
    .returning()
    .get();
}

/** Profile → photo sheet: the initial's color, the photo file, the Reminders switch. */
export function setAvatarColor(db: Db, color: AvatarColor): void {
  db.update(profile).set({ avatarColor: color }).run();
}

/** `null` removes the photo; the initial shows again. */
export function setPhoto(db: Db, uri: string | null): void {
  db.update(profile).set({ photoUri: uri }).run();
}

/** The eye on Home's balance card (Main): hide or show every amount. */
export function setHideAmounts(db: Db, hide: boolean): void {
  db.update(profile).set({ hideAmounts: hide }).run();
}

/** `null` follows the phone's language again. */
export function setLanguage(db: Db, language: 'en' | 'ka' | null): void {
  db.update(profile).set({ language }).run();
}

export function setReminders(db: Db, on: boolean): void {
  db.update(profile).set({ reminders: on }).run();
}

export type ReminderKind = 'remindBills' | 'remindPayday' | 'remindLowBudget' | 'remindEvening';

/** One of the four switches under Reminders (ProfileReminders). */
export function setReminderKind(db: Db, kind: ReminderKind, on: boolean): void {
  db.update(profile)
    .set({ [kind]: on })
    .run();
}

export function markOnboarded(db: Db, at = new Date()): void {
  db.update(profile).set({ onboardedAt: at.toISOString() }).run();
}

/** The total balance right now (#6), or `null` before a starting balance is set. */
export function currentBalance(db: Db): number | null {
  return totalBalance(db.select().from(transactions).all());
}

/**
 * Sets the total balance to what the user typed (#6) by storing the difference
 * as an adjustment. The first one is the starting balance.
 */
export function adjustBalance(
  db: Db,
  typedMinor: number,
  date: CalendarDate,
  newId = defaultNewId,
): void {
  const me = getProfile(db);
  if (!me) throw new Error('No profile yet');
  const fix = balanceAdjustment(currentBalance(db), typedMinor);
  if (!fix) return;
  db.insert(transactions)
    .values({
      id: newId(),
      kind: fix.kind,
      amountMinor: fix.amountMinor,
      currency: me.currency,
      categoryId: null,
      title: 'Balance adjusted',
      date,
      occurredAt: new Date().toISOString(),
      source: 'adjustment',
    })
    .run();
}
