// Keeps the phone's scheduled reminders in step with Kept (#15). Mounted once
// in the root layout; renders nothing. Whenever bills, income, transactions or
// the switches change, it plans the next weeks again (./plan.ts) and replaces
// what's scheduled.

import { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/domain/money';
import { addDays } from '@/domain/dates';
import { useBills, useIncomes, useManualDates, useMoneyMonth } from '@/features/live';
import { JAR_REMINDER_PREFIX } from '@/features/savings/reminders';
import { Notifications } from './notifications';
import { planReminders } from './plan';

export const CHANNEL = 'reminders';

// Shown as a banner even while Kept is open, without a sound: gentle.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Whether Kept may show notifications; never asks. */
export async function notificationsAllowed(): Promise<boolean> {
  if (!Notifications) return false;
  const { IosAuthorizationStatus } = Notifications;
  const settings = await Notifications.getPermissionsAsync();
  return (
    settings.granted ||
    settings.ios?.status === IosAuthorizationStatus.PROVISIONAL ||
    settings.ios?.status === IosAuthorizationStatus.AUTHORIZED
  );
}

/** Asks once (the system shows its own prompt); `false` when declined. */
export async function askForNotifications(): Promise<boolean> {
  if (await notificationsAllowed()) return true;
  if (!Notifications) return false;
  const { IosAuthorizationStatus } = Notifications;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted || result.ios?.status === IosAuthorizationStatus.AUTHORIZED;
}

/** Cancels the planned reminders, but not a jar's own (JarRemindersSync). */
async function clearPlanned() {
  const N = Notifications;
  if (!N) return;
  const pending = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => !n.identifier.startsWith(JAR_REMINDER_PREFIX))
      .map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function ensureChannel(name: string) {
  if (Platform.OS !== 'android') return;
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export function RemindersSync() {
  const { t } = useTranslation();
  const { profile, today } = useMoneyMonth();
  const bills = useBills();
  const incomes = useIncomes();

  const currency = profile?.currency ?? 'GEL';
  const reminders = profile?.reminders ?? false;
  const remindBills = profile?.remindBills ?? false;
  const remindPayday = profile?.remindPayday ?? false;
  const remindEvening = profile?.remindEvening ?? false;

  // Evening check-ins look a week ahead; the day before too, in case "now" is
  // still yesterday's evening when the date has just turned.
  const addedDates = useManualDates(addDays(today, -1), addDays(today, 8));

  // Planned from "now" each time something changes; the key skips rescheduling
  // when the plan comes out the same.
  const plan = useMemo(
    () =>
      planReminders({
        now: new Date(),
        switches: { reminders, remindBills, remindPayday, remindEvening },
        bills,
        incomes,
        addedDates,
        money: (minor) => formatMoney(minor, currency, { decimals: 'auto' }),
        words: {
          billTitle: (name) => t('remindersScreen.notify.billTitle', { name }),
          billBody: (amount, auto, day) =>
            auto
              ? t('remindersScreen.notify.billAuto', {
                  amount,
                  day: t('onboarding.income.paydayValue', { count: day, ordinal: true }),
                })
              : t('remindersScreen.notify.billManual', { amount }),
          paydayTitle: () => t('remindersScreen.notify.paydayTitle'),
          paydayBody: (name, amount) => t('remindersScreen.notify.paydayBody', { name, amount }),
          eveningTitle: () => t('remindersScreen.notify.eveningTitle'),
          eveningBody: () => t('remindersScreen.notify.eveningBody'),
        },
      }),
    [reminders, remindBills, remindPayday, remindEvening, bills, incomes, addedDates, currency, t],
  );

  const scheduled = useRef('');
  useEffect(() => {
    const N = Notifications;
    if (!N) return;
    const key = JSON.stringify(plan.map((r) => [r.id, r.at.getTime(), r.title, r.body]));
    if (key === scheduled.current) return;
    let cancelled = false;
    (async () => {
      // Off, or not allowed: nothing stays scheduled.
      if (plan.length === 0 || !(await notificationsAllowed())) {
        await clearPlanned();
        scheduled.current = key;
        return;
      }
      await ensureChannel(t('remindersScreen.title'));
      await clearPlanned();
      for (const r of plan) {
        if (cancelled) return;
        await N.scheduleNotificationAsync({
          identifier: r.id,
          content: { title: r.title, body: r.body },
          trigger: {
            type: N.SchedulableTriggerInputTypes.DATE,
            date: r.at,
            channelId: CHANNEL,
          },
        });
      }
      scheduled.current = key;
    })().catch(() => {
      // Scheduling is best effort; the next change tries again.
      scheduled.current = '';
    });
    return () => {
      cancelled = true;
    };
  }, [plan, t]);

  return null;
}
