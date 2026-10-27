// Keeps each jar's "Remind me" in step with the phone: one repeating
// notification per jar (daily or monthly), replaced whenever a jar or the
// Reminders switch changes. Tapping one opens Add to jar on that jar. Mounted
// once in the root layout next to RemindersSync; renders nothing.

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/domain/money';
import { useJars, useProfile } from '@/features/live';
import { Notifications } from '@/features/reminders/notifications';
import { CHANNEL, ensureChannel, notificationsAllowed } from '@/features/reminders/RemindersSync';
import { JAR_REMINDER_PREFIX, planJarReminders } from './reminders';

async function clearJarReminders() {
  const N = Notifications;
  if (!N) return;
  const pending = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => n.identifier.startsWith(JAR_REMINDER_PREFIX))
      .map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export function JarRemindersSync() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfile();
  const jars = useJars();
  const currency = profile?.currency ?? 'GEL';
  const remindersOn = profile?.reminders ?? false;

  const plan = useMemo(
    () =>
      planJarReminders(
        jars,
        remindersOn,
        (minor) => formatMoney(minor, currency, { decimals: 'auto' }),
        {
          title: (name) => t('savings.notify.title', { name }),
          body: (amount, cadence) => t(`savings.notify.body.${cadence}`, { amount }),
        },
      ),
    [jars, remindersOn, currency, t],
  );

  const scheduled = useRef('');
  useEffect(() => {
    const N = Notifications;
    if (!N) return;
    const key = JSON.stringify(plan);
    if (key === scheduled.current) return;
    let cancelled = false;
    (async () => {
      await clearJarReminders();
      if (plan.length === 0 || !(await notificationsAllowed())) {
        scheduled.current = key;
        return;
      }
      await ensureChannel(t('remindersScreen.title'));
      for (const r of plan) {
        if (cancelled) return;
        await N.scheduleNotificationAsync({
          identifier: r.id,
          content: {
            title: r.title,
            body: r.body,
            data: { url: `/savings-add?jar=${r.jarId}` },
          },
          trigger:
            r.day === null
              ? {
                  type: N.SchedulableTriggerInputTypes.DAILY,
                  hour: r.hour,
                  minute: r.minute,
                  channelId: CHANNEL,
                }
              : {
                  type: N.SchedulableTriggerInputTypes.MONTHLY,
                  day: r.day,
                  hour: r.hour,
                  minute: r.minute,
                  channelId: CHANNEL,
                },
        });
      }
      scheduled.current = key;
    })().catch(() => {
      // Best effort, like the other reminders; the next change tries again.
      scheduled.current = '';
    });
    return () => {
      cancelled = true;
    };
  }, [plan, t]);

  // A tapped jar reminder opens Add to jar on that jar, also from a cold start.
  const response = Notifications?.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    const url = response.notification.request.content.data?.url;
    if (handled.current === id || !id.startsWith(JAR_REMINDER_PREFIX)) return;
    if (typeof url !== 'string' || !url.startsWith('/savings-add')) return;
    handled.current = id;
    router.push(url as never);
    Notifications?.clearLastNotificationResponseAsync?.().catch(() => {});
  }, [response, router]);

  return null;
}
