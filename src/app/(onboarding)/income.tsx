import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, ChevronDownIcon } from '@/components/Icons';
import { Numpad } from '@/components/Numpad';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { currencies, parseAmount } from '@/domain/money';
import { AmountDisplay, groupTyped } from '@/features/onboarding/AmountDisplay';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { useOnboarding } from '@/features/onboarding/store';
import { color, radius, shadow, text } from '@/theme';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// OBIncome: step 3 of 4. Take-home pay on the keypad, and the payday.
export default function IncomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currency, income, payday, setIncome, setPayday } = useOnboarding();
  const [picking, setPicking] = useState(false);

  const amount = parseAmount(income, currency) ?? 0;
  const currencyChip = `${currencies[currency].symbol} ${currency}`;
  const ordinal = (day: number) =>
    t('onboarding.income.paydayValue', { count: day, ordinal: true });

  return (
    <>
      <OnboardingStep
        step={3}
        onBack={router.back}
        title={t('onboarding.income.title')}
        hint={t('onboarding.income.hint')}
        primary={{
          label: t('common.continue'),
          onPress: () => router.push('/bills'),
          disabled: amount <= 0,
        }}
      >
        <Press
          accessibilityLabel={t('onboarding.income.currencyChip', {
            currency: t(`currencies.${currency}`),
          })}
          onPress={() => router.back()}
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
