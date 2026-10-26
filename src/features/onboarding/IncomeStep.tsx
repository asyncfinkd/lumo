import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, ChevronDownIcon } from '@/components/Icons';
import { Numpad, typedAmount } from '@/components/Numpad';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { currencies, parseAmount } from '@/domain/money';
import { AmountDisplay, groupTyped } from '@/components/AmountDisplay';
import { db } from '@/db/client';
import { useIncomes, useProfile } from '@/features/live';
import { saveProfile } from '@/features/profile/repo';
import { saveIncome } from '@/features/recurring/repo';
import { OnboardingStep } from './OnboardingStep';
import { useOnboarding } from './store';
import { color, radius, shadow, text } from '@/theme';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * OBIncome: take-home pay on the keypad, and the payday. In onboarding it's
 * step 3 of 4; from Profile (`settings`) it starts at the saved salary and
 * saves it with the payday.
 */
export function IncomeStep({ mode }: { mode: 'onboarding' | 'settings' }) {
  const { t } = useTranslation();
  const router = useRouter();
  const settings = mode === 'settings';
  const onboarding = useOnboarding();
  const profile = useProfile();
  const salary = useIncomes()[0];
  // From Profile, the keypad starts at the saved amount and day.
  const [edited, setEdited] = useState<{ income?: string; payday?: number }>({});
  const [picking, setPicking] = useState(false);

  const currency = settings ? (profile?.currency ?? 'GEL') : onboarding.currency;
  const income = settings
    ? (edited.income ?? (salary ? typedAmount(salary.amountMinor, currency) : '0'))
    : onboarding.income;
  const payday = settings ? (edited.payday ?? profile?.payday ?? 1) : onboarding.payday;
  const setIncome = settings
    ? (next: string) => setEdited((e) => ({ ...e, income: next }))
    : onboarding.setIncome;
  const setPayday = settings
    ? (day: number) => setEdited((e) => ({ ...e, payday: day }))
    : onboarding.setPayday;

  const save = () => {
    const amountMinor = parseAmount(income, currency) ?? 0;
    if (!profile || amountMinor <= 0) return;
    saveProfile(db, { ...profile, payday });
    saveIncome(db, {
      id: salary?.id,
      name: salary?.name ?? t('categories.salary'),
      amountMinor,
      day: payday,
    });
    router.back();
  };

  const amount = parseAmount(income, currency) ?? 0;
  const currencyChip = `${currencies[currency].symbol} ${currency}`;
  const ordinal = (day: number) =>
    t('onboarding.income.paydayValue', { count: day, ordinal: true });

  return (
    <>
      <OnboardingStep
        step={3}
        heading={settings ? t('profile.income') : undefined}
        onBack={router.back}
        title={t('onboarding.income.title')}
        hint={t('onboarding.income.hint')}
        primary={{
          label: settings ? t('common.save') : t('common.continue'),
          onPress: settings ? save : () => router.push('/bills'),
          disabled: amount <= 0,
        }}
      >
        <Press
          accessibilityLabel={t('onboarding.income.currencyChip', {
            currency: t(`currencies.${currency}`),
          })}
          onPress={() => (settings ? router.push('/profile-currency') : router.back())}
          style={styles.currency}
        >
          <Text style={styles.currencyText}>{currencyChip}</Text>
          <ChevronDownIcon color={color.muted} />
        </Press>

        <View style={styles.amount}>
          <AmountDisplay
            typed={income}
            currency={currency}
            accessibilityLabel={t('onboarding.income.amountLabel', {
              amount: `${currencies[currency].symbol}${groupTyped(income)}`,
            })}
          />
        </View>

        <View style={styles.payday}>
          <View style={styles.paydayIcon}>
            <CalendarIcon color={color.cameInIcon} />
          </View>
          <Text style={styles.paydayLabel}>{t('onboarding.income.payday')}</Text>
          <Press
            accessibilityLabel={t('onboarding.income.paydayLabel', { day: ordinal(payday) })}
            onPress={() => setPicking(true)}
            style={styles.paydayButton}
          >
            <Text style={styles.paydayValue}>
              {t('onboarding.income.paydayEvery', { day: ordinal(payday) })}
            </Text>
            <ChevronDownIcon color={color.muted} />
          </Press>
        </View>

        <View style={styles.keys}>
          <Numpad value={income} onChange={setIncome} currency={currency} keyHeight={52} />
        </View>
      </OnboardingStep>

      {picking ? (
        <Sheet
          accessibilityLabel={t('onboarding.income.pickPayday')}
          onDismissed={() => setPicking(false)}
        >
          {(close) => (
            <View>
              <Text style={styles.sheetTitle}>{t('onboarding.income.pickPayday')}</Text>
              <View accessibilityRole="radiogroup" style={styles.days}>
                {DAYS.map((day) => (
                  <Press
                    key={day}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: day === payday }}
                    accessibilityLabel={ordinal(day)}
                    onPress={() => {
                      setPayday(day);
                      close();
                    }}
                    style={[styles.day, day === payday && styles.dayOn]}
                  >
                    <Text style={[styles.dayText, day === payday && styles.dayTextOn]}>{day}</Text>
                  </Press>
                ))}
              </View>
            </View>
          )}
        </Sheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  currency: {
    marginTop: 20,
    alignSelf: 'center',
    height: 36,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: color.track,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyText: { ...text.label, fontFamily: text.h1.fontFamily, color: color.ink },
  amount: { marginTop: 10 },
  payday: {
    marginTop: 16,
    height: 56,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.listCard,
    boxShadow: shadow.search,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paydayIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: color.cameInTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paydayLabel: { ...text.rowTitle, flex: 1, color: color.ink },
  paydayButton: {
    height: 36,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: color.track,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paydayValue: { ...text.label, color: color.ink },
  keys: { marginTop: 12 },
  sheetTitle: { ...text.section, color: color.ink, textAlign: 'center', marginTop: 14 },
  days: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  day: {
    width: 40,
    height: 44,
    borderRadius: 14,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: color.ink },
  dayText: { ...text.label, color: color.ink },
  dayTextOn: { color: color.white },
});
