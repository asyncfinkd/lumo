import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DigitRoll } from '@/components/DigitRoll';
import { Fill } from '@/components/motion';
import { Press } from '@/components/Press';
import { type CurrencyCode, formatMoney, percent } from '@/domain/money';
import type { MonthSummary } from '@/features/money/summary';
import { color, fontFamily, gradient, radius, shadow, text } from '@/theme';

type Props = {
  summary: MonthSummary;
  currency: CurrencyCode;
  /** Opens the balance sheet: to add the starting balance or fix it. */
  onBalance: () => void;
};

/**
 * The hero card: what's left this pay period (#2), how much of it is spent,
 * days to payday and the total balance (#6). Never shows a negative number:
 * overspending reads as ₾0 plus a gentle line.
 */
export function LeftToSpendCard({ summary, currency, onBalance }: Props) {
  const { t } = useTranslation();
  const { left, daysLeft, balanceMinor } = summary;
  const available = formatMoney(left.availableMinor, currency, { decimals: 'auto' });
  const leftPercent = percent(left.leftMinor, left.availableMinor);
  const balance = balanceMinor === null ? null : formatMoney(balanceMinor, currency);

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{t('home.leftToSpend')}</Text>
      </View>

      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={t('home.leftOf', {
          left: formatMoney(left.leftMinor, currency),
          available,
        })}
        style={styles.amountRow}
      >
        <DigitRoll minor={left.leftMinor} currency={currency} />
        <Text style={styles.of}>{t('home.ofAvailable', { amount: available })}</Text>
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('home.budgetLeft')}
        accessibilityValue={{ min: 0, max: 100, now: leftPercent }}
        style={styles.track}
      >
        <Fill percent={leftPercent} style={styles.fill} />
      </View>
      <View style={styles.progressInfo}>
        <Text style={styles.small}>{t('home.spentPercent', { percent: left.spentPercent })}</Text>
        <Text style={styles.small}>{t('home.daysLeft', { count: daysLeft })}</Text>
      </View>

      {left.overMinor > 0 ? (
        <Text style={styles.over}>
          {t('home.overspent', { amount: formatMoney(left.overMinor, currency) })}
        </Text>
      ) : null}

      <Press
        accessibilityRole="button"
        accessibilityLabel={balance ? `${t('home.totalBalance')} ${balance}` : t('home.addBalance')}
        accessibilityHint={balance ? t('home.changeBalance') : undefined}
        hitSlop={{ top: 13, bottom: 13 }}
        onPress={onBalance}
        style={styles.balanceRow}
      >
        <Text style={styles.balanceLabel}>{t('home.totalBalance')}</Text>
        {balance ? (
          <Text style={styles.balance}>{balance}</Text>
        ) : (
          <Text style={styles.addBalance}>{t('home.addBalance')}</Text>
        )}
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 20,
    borderRadius: radius.hero,
    borderCurve: 'continuous',
    backgroundColor: color.heroCard,
    backgroundImage: gradient.heroGlow,
    boxShadow: shadow.hero,
  },
  labelRow: { height: 28, justifyContent: 'center' },
  label: { ...text.label, color: color.muted },
  amountRow: { marginTop: 2, flexDirection: 'row', alignItems: 'flex-end' },
  of: {
    ...text.label,
    fontFamily: fontFamily.semibold,
    color: color.muted,
    marginLeft: 8,
    marginBottom: 9,
  },
  track: {
    marginTop: 12,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: color.track,
    overflow: 'hidden',
  },
  fill: { backgroundImage: gradient.progress },
  progressInfo: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  small: { ...text.small, color: color.muted, fontVariant: ['tabular-nums'] },
  over: { ...text.meta, marginTop: 10, color: color.warning },
  balanceRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { ...text.meta, color: color.muted },
  balance: {
    ...text.meta,
    fontFamily: fontFamily.bold,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  addBalance: { ...text.meta, fontFamily: fontFamily.bold, color: color.accentDeep },
});
