// Keeps the phone's scheduled reminders in step with Lumo (#15). Mounted once
// in the root layout; renders nothing. Whenever bills, income, transactions or
// the switches change, it plans the next weeks again (./plan.ts) and replaces
// what's scheduled. A budget running low is sent the moment it happens.

import { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/domain/money';
import { budgetRows } from '@/features/budgets/budgetRows';
import { useCategories } from '@/features/categories/categories';
import {
  useActiveBills,
  useAllTransactions,
  useBills,
  useBudgets,
  useIncomes,
  useMoneyMonth,
} from '@/features/live';
import { newlyLow, outsideQuietHours, planReminders } from './plan';

const CHANNEL = 'reminders';

// Shown as a banner even while Lumo is open, without a sound: gentle.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Whether Lumo may show notifications; never asks. */
export async function notificationsAllowed(): Promise<boolean> {
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
  const result = await Notifications.requestPermissionsAsync();
  return result.granted || result.ios?.status === IosAuthorizationStatus.AUTHORIZED;
}

/** Cancels the planned reminders, but not a "budget running low" waiting for 8:00. */
async function clearPlanned() {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => !n.identifier.startsWith('low-'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function ensureChannel(name: string) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name,
    importance: AndroidImportance.DEFAULT,
  });
}

export function RemindersSync() {
  const { t } = useTranslation();
  const { profile, summary } = useMoneyMonth();
  const bills = useBills();
  const activeBills = useActiveBills();
  const incomes = useIncomes();
  const transactions = useAllTransactions();
  const budgets = useBudgets();
  const categories = useCategories();

  const currency = profile?.currency ?? 'GEL';
  const reminders = profile?.reminders ?? false;
  const remindBills = profile?.remindBills ?? false;
  const remindPayday = profile?.remindPayday ?? false;
  const remindEvening = profile?.remindEvening ?? false;

  const addedDates = useMemo(
    () => new Set(transactions.filter((tx) => tx.source === 'manual').map((tx) => tx.date)),
    [transactions],
  );

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
        await Notifications.scheduleNotificationAsync({
          identifier: r.id,
          content: { title: r.title, body: r.body },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
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

  // A budget running low: compare with the last time, only while Lumo runs,
  // so a restart never repeats one.
  const lowBefore = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    if (!summary) return;
    const rows = budgetRows({ budgets, transactions, bills: activeBills, period: summary.period });
    const now = new Map(rows.map((r) => [r.category, r.leftPercent]));
    const dropped = newlyLow(lowBefore.current, now);
    lowBefore.current = now;
    if (!profile?.reminders || !profile.remindLowBudget || dropped.length === 0) return;
    (async () => {
      if (!(await notificationsAllowed())) return;
      await ensureChannel(t('remindersScreen.title'));
      for (const id of dropped) {
        const row = rows.find((r) => r.category === id)!;
        const later = outsideQuietHours(new Date());
        await Notifications.scheduleNotificationAsync({
          identifier: `low-${id}-${summary.period.start}`,
          content: {
            title: t('remindersScreen.notify.lowTitle', { category: categories.get(id).label }),
            body: t('remindersScreen.notify.lowBody', {
              left: formatMoney(row.leftMinor, currency, { decimals: 'auto' }),
            }),
          },
          trigger: later
            ? {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: later,
                channelId: CHANNEL,
              }
            : null,
        });
      }
    })().catch(() => {});
  }, [
    summary,
    budgets,
    transactions,
    activeBills,
    profile?.reminders,
    profile?.remindLowBudget,
    categories,
    currency,
    t,
  ]);

  return null;
}
