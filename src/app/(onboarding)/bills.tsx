import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BillIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { currencies, formatMoney } from '@/domain/money';
import { BUDGETING } from '@/features/flags';
import { BILL_KEYS, type BillKey, cleanAmount } from '@/features/onboarding/bills';
import { finishOnboarding } from '@/features/onboarding/finish';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { chosenBills } from '@/features/onboarding/save';
import { useOnboarding } from '@/features/onboarding/store';
import { billColor, color, radius, shadow, text } from '@/theme';

// OBBills: step 4 of 4. Tap a bill to turn it on, then type its monthly amount.
export default function BillsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const answers = useOnboarding();
  const { currency, bills, setBill } = answers;
  const [saving, setSaving] = useState(false);

  const totalMinor = chosenBills({ bills, currency }).reduce((sum, b) => sum + b.amountMinor, 0);
  // "Your month" shows Left to spend, which is off in phase 1: bills is the last
  // step, and the root guard opens Home once the profile is saved.
  const next = () => {
    if (BUDGETING) {
      router.push('/your-month');
      return;
    }
    if (saving) return;
    setSaving(true);
    finishOnboarding(answers);
  };

  return (
    <OnboardingStep
      step={4}
      onBack={router.back}
      title={t('onboarding.bills.title')}
      hint={t('onboarding.bills.hint')}
      primary={{ label: t('common.continue'), onPress: next }}
      secondary={{ label: t('common.skipForNow'), onPress: next }}
    >
      <View style={styles.grid}>
        {BILL_KEYS.map((key) => (
          <BillTile
            key={key}
            billKey={key}
            label={t(`onboarding.bills.items.${key}`)}
            on={bills[key].on}
            amount={bills[key].amount}
            symbol={currencies[currency].symbol}
            offText={t(
              key === 'other' ? 'onboarding.bills.addYourOwn' : 'onboarding.bills.tapToAdd',
            )}
            amountLabel={t('onboarding.bills.amountLabel', {
              bill: t(`onboarding.bills.items.${key}`),
            })}
            onToggle={() => setBill(key, { on: !bills[key].on })}
            onAmount={(amount) => setBill(key, { amount: cleanAmount(amount) })}
          />
        ))}
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.total}>
        {t('onboarding.bills.total', {
          amount: formatMoney(totalMinor, currency, { decimals: 'auto' }),
        })}
      </Text>
    </OnboardingStep>
  );
}

function BillTile({
  billKey,
  label,
  on,
  amount,
  symbol,
  offText,
  amountLabel,
  onToggle,
  onAmount,
}: {
  billKey: BillKey;
  label: string;
  on: boolean;
  amount: string;
  symbol: string;
  offText: string;
  amountLabel: string;
  onToggle: () => void;
  onAmount: (amount: string) => void;
}) {
  const c = billColor[billKey];
  return (
    <View style={[styles.tile, { backgroundColor: on ? c.selected : color.tileOff }]}>
      <Press
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel={label}
        onPress={onToggle}
        style={styles.toggle}
      >
        <View style={[styles.icon, { backgroundColor: on ? color.chipDot : c.bg }]}>
          <BillIcon name={billKey} color={c.fg} />
        </View>
        <Text style={styles.name}>{label}</Text>
      </Press>
      {on ? (
        <View style={styles.amount}>
          <Text style={styles.symbol}>{symbol}</Text>
          <TextInput
            accessibilityLabel={amountLabel}
            value={amount}
            onChangeText={onAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={color.placeholder}
            style={styles.amountInput}
          />
        </View>
      ) : (
        <Text style={styles.off}>{offText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    // Three per row with two 8pt gaps.
    width: '31.8%',
    flexGrow: 1,
    height: 118,
    padding: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
    boxShadow: shadow.tile,
  },
  toggle: { alignItems: 'flex-start', gap: 8 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...text.label, fontSize: 14, lineHeight: 18, color: color.ink },
  amount: {
    marginTop: 'auto',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: color.listCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  symbol: { ...text.label, fontSize: 14, color: color.muted },
  amountInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    ...text.label,
    fontSize: 14,
    color: color.ink,
  },
  off: { marginTop: 'auto', ...text.meta, fontSize: 12, color: color.muted },
  total: {
    marginTop: 20,
    textAlign: 'center',
    ...text.label,
    fontFamily: text.h1.fontFamily,
    color: color.ink,
  },
});
