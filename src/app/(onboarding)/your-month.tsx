import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Path } from 'react-native-svg';
import { Orbs } from '@/components/Backdrop';
import { Button } from '@/components/Button';
import { CameInIcon, CategoryIcon } from '@/components/Icons';
import { Rise } from '@/components/motion';
import { payPeriod, toCalendarDate } from '@/domain/dates';
import { currencies, formatMoney, parseAmount, perDay } from '@/domain/money';
import { finishOnboarding } from '@/features/onboarding/finish';
import { chosenBills } from '@/features/onboarding/save';
import { useOnboarding } from '@/features/onboarding/store';
import { useCountUp } from '@/features/onboarding/useCountUp';
import { categoryColor, color, gradient, radius, shadow, space, text } from '@/theme';

// OBReveal: income − bills = yours to spend, then save everything.
export default function YourMonthScreen() {
  const { t } = useTranslation();
  const answers = useOnboarding();
  const [saving, setSaving] = useState(false);

  const { currency } = answers;
  const incomeMinor = parseAmount(answers.income, currency) ?? 0;
  const billsMinor = chosenBills(answers).reduce((sum, b) => sum + b.amountMinor, 0);
  const spendMinor = Math.max(incomeMinor - billsMinor, 0);
  const { days } = payPeriod(toCalendarDate(new Date()), answers.payday);

  // Rows count up over the first 70% of 1.5s, the total over the last 70%.
  const income = useCountUp(incomeMinor, 1050, 350);
  const bills = useCountUp(billsMinor, 1050, 350);
  const spend = useCountUp(spendMinor, 1050, 800);

  const whole = (minor: number) => formatMoney(minor, currency, { decimals: 'auto' });

  const finish = () => {
    if (saving) return;
    setSaving(true);
    // No navigation here: the root guard flips once the profile is saved and opens Home.
    finishOnboarding(answers);
  };

  return (
    <View style={styles.root}>
      <Orbs />
      <View style={styles.main}>
        <Rise>
          <Text accessibilityRole="header" style={styles.title}>
            {t('onboarding.reveal.title', { name: answers.name.trim() })}
          </Text>
        </Rise>
        <Rise delay={100}>
          <Text style={styles.hint}>{t('onboarding.reveal.hint')}</Text>
        </Rise>

        <Rise delay={200} style={styles.card}>
          <View accessible accessibilityLabel={t('onboarding.reveal.breakdown')}>
            <Row
              icon={
                <View style={[styles.rowIcon, { backgroundColor: color.cameInTile }]}>
                  <CameInIcon color={color.cameInIcon} />
                </View>
              }
              label={t('onboarding.reveal.income')}
              value={whole(income)}
              valueColor={color.good}
            />
            <Row
              icon={
                <View style={[styles.rowIcon, { backgroundColor: categoryColor.home.bg }]}>
                  <CategoryIcon id="home" size={20} color={categoryColor.home.fg} />
                </View>
              }
              label={t('onboarding.reveal.bills')}
              value={`${'−'}${whole(bills)}`}
            />
          </View>
          <View style={styles.divider} />
          <Text style={styles.spendLabel}>{t('onboarding.reveal.yoursToSpend')}</Text>
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={whole(spendMinor)}
            style={styles.spendRow}
          >
            <Text style={styles.spendSymbol}>{currencies[currency].symbol}</Text>
            <Text style={styles.spend}>
              {whole(spend).replace(currencies[currency].symbol, '')}
            </Text>
          </View>
        </Rise>

        <Rise delay={500} style={styles.perDay}>
          <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
            <Circle cx={12} cy={12} r={4} fill={color.orbButter} />
            <Path
              d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
              stroke={color.insightIcon}
              strokeWidth={1.9}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.perDayText}>
            {t('onboarding.reveal.perDay', {
              amount: formatMoney(perDay(spendMinor, days, currency), currency, {
                decimals: 'none',
              }),
            })}
          </Text>
        </Rise>
      </View>

      <View style={styles.actions}>
        <Button label={t('onboarding.reveal.looksGood')} onPress={finish} disabled={saving} />
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  valueColor = color.ink,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      {icon}
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  main: { flex: 1, paddingTop: 96, paddingHorizontal: space.screen, alignItems: 'center' },
  title: { ...text.h1, color: color.ink, textAlign: 'center' },
  hint: {
    ...text.label,
    fontFamily: text.subtitle.fontFamily,
    lineHeight: 21,
    color: color.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    marginTop: 28,
    alignSelf: 'stretch',
    borderRadius: radius.hero,
    borderCurve: 'continuous',
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: color.heroCard,
    backgroundImage: gradient.heroGlow,
    boxShadow: shadow.hero,
  },
  row: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...text.rowTitle, flex: 1, color: color.ink },
  rowValue: { ...text.rowTitle, fontVariant: ['tabular-nums'] },
  divider: {
    marginTop: 12,
    marginBottom: 16,
    height: 2,
    borderRadius: 999,
    backgroundColor: color.wash,
  },
  spendLabel: { ...text.label, color: color.muted },
  spendRow: { marginTop: 2, height: 54, flexDirection: 'row', alignItems: 'flex-end' },
  spendSymbol: {
    fontFamily: text.subtitle.fontFamily,
    fontSize: 28,
    lineHeight: 28,
    color: color.subtle,
    marginRight: 4,
    marginBottom: 6,
  },
  spend: {
    fontFamily: text.h1.fontFamily,
    fontSize: 52,
    lineHeight: 52,
    letterSpacing: -1,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  perDay: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  perDayText: { ...text.rowTitle, lineHeight: undefined, color: color.muted },
  actions: { paddingHorizontal: space.screen, paddingBottom: 34 },
});
