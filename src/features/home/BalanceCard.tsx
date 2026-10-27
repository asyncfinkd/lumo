import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DigitRoll } from '@/components/DigitRoll';
import { ArrowUpIcon, EyeIcon, EyeOffIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import type { CalendarDate } from '@/domain/dates';
import { type CurrencyCode, formatMoney } from '@/domain/money';
import { maskAmount, useAmountsHidden } from '@/features/privacy/amounts';
import { shortDate } from '@/features/transactions/addForm';
import { color, fontFamily, gradient, radius, shadow, text } from '@/theme';

type Props = {
  balanceMinor: number | null;
  /** Since the 1st of the month; `null` with nothing earlier to compare. */
  change: { since: CalendarDate; deltaMinor: number } | null;
  currency: CurrencyCode;
  /** Opens the balance sheet: to add the starting balance or fix it (#6). */
  onBalance: () => void;
  /** The eye: hide or show every amount (Main). */
  onToggleHidden: () => void;
};

/**
 * Home's hero card in phase 1 (Main): your balance, and how it moved since the
 * 1st of the month. Tap it to correct the balance.
 */
export function BalanceCard({ balanceMinor, change, currency, onBalance, onToggleHidden }: Props) {
  const { t, i18n } = useTranslation();
  const hidden = useAmountsHidden();
  const balance = balanceMinor === null ? null : formatMoney(balanceMinor, currency);
  const up = (change?.deltaMinor ?? 0) >= 0;
  const changeLine = change
    ? t(change.deltaMinor === 0 ? 'home.sameAs' : up ? 'home.moreThan' : 'home.lessThan', {
        date: shortDate(change.since, i18n.language),
      })
    : null;

  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={
        balance && hidden
          ? t('home.balanceHidden')
          : balance
            ? [
                `${t('home.yourBalance')} ${balance}`,
                changeLine && change
                  ? `${formatMoney(Math.abs(change.deltaMinor), currency)} ${changeLine}`
                  : null,
              ]
                .filter(Boolean)
                .join(', ')
            : t('home.addBalance')
      }
      accessibilityHint={balance ? t('home.changeBalance') : undefined}
      onPress={onBalance}
      style={styles.card}
    >
      <View style={styles.labelRow}>
        <Text style={styles.label}>{t('home.yourBalance')}</Text>
        <Press
          accessibilityRole="button"
          accessibilityState={{ selected: hidden }}
          accessibilityLabel={hidden ? t('home.showAmounts') : t('home.hideAmounts')}
          haptic
          hitSlop={4}
          onPress={onToggleHidden}
          style={[styles.eye, { backgroundColor: hidden ? color.track : color.washSoft }]}
        >
          {hidden ? <EyeOffIcon color={color.muted} /> : <EyeIcon color={color.muted} />}
        </Press>
      </View>
      {balanceMinor === null ? (
        <Text style={styles.add}>{t('home.addBalance')}</Text>
      ) : (
        <View style={styles.amount}>
          <DigitRoll minor={balanceMinor} currency={currency} hidden={hidden} />
        </View>
      )}
      {change && changeLine ? (
        <View style={styles.changeRow}>
          <View style={[styles.chip, { backgroundColor: up ? color.goodSoft : color.calmSoft }]}>
            <ArrowUpIcon color={up ? color.good : color.muted} down={!up} />
            <Text style={[styles.chipText, { color: up ? color.good : color.muted }]}>
              {hidden
                ? maskAmount(formatMoney(Math.abs(change.deltaMinor), currency))
                : formatMoney(Math.abs(change.deltaMinor), currency, { decimals: 'auto' })}
            </Text>
          </View>
          <Text style={styles.changeText}>{changeLine}</Text>
        </View>
      ) : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRadius: radius.hero,
    borderCurve: 'continuous',
    backgroundColor: color.heroCard,
    backgroundImage: gradient.heroGlow,
    boxShadow: shadow.hero,
  },
  labelRow: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { ...text.label, fontSize: 15, lineHeight: 20, color: color.muted },
  eye: {
    width: 36,
    height: 36,
    marginRight: -6,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: { marginTop: 2, flexDirection: 'row', alignItems: 'flex-end' },
  add: {
    ...text.section,
    marginTop: 10,
    fontFamily: fontFamily.bold,
    color: color.accentDeep,
  },
  changeRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    height: 30,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: { fontFamily: fontFamily.extrabold, fontSize: 13, fontVariant: ['tabular-nums'] },
  changeText: { fontFamily: fontFamily.semibold, fontSize: 13, color: color.muted },
});
