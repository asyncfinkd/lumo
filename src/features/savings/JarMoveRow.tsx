import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { JarIcon, JarMoveIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import type { CategoryColorKey } from '@/db/categories';
import { formatMoney } from '@/domain/money';
import type { JarMove } from '@/features/history/history';
import { clockTime } from '@/features/home/home';
import { maskAmount, useAmountsHidden } from '@/features/privacy/amounts';
import {
  categoryPalette,
  color,
  fontFamily,
  radius,
  savingsColor,
  shadow,
  size,
  text,
} from '@/theme';
import type { JarTone } from './savings';

/** Each jar's tile wears its own color, as on the jar. */
const TILE: Record<JarTone, CategoryColorKey> = {
  gold: 'butter',
  sky: 'sky',
  blush: 'blush',
  sage: 'sage',
};

/**
 * A jar row in History (HistoryJars): "Summer trip jar · Put in · 12:30
 * −₾100". The amount is muted, like an adjustment: it moved money, it isn't
 * spending or income. Opens Savings.
 */
export function JarMoveRow({ move, onPress }: { move: JarMove; onPress: () => void }) {
  const { t } = useTranslation();
  const hidden = useAmountsHidden();
  const tile = categoryPalette[TILE[move.tone]];
  const title = t('history.jar.title', { name: move.name });
  const meta = t(`history.jar.${move.move}`, { time: clockTime(move.createdAt) });
  const tag = move.move === 'done' ? t('history.jar.doneTag') : null;
  // Into the jar leaves the balance (−), out of it comes back (+).
  const amount = formatMoney(Math.abs(move.amountMinor), move.currency, {
    sign: move.amountMinor > 0 ? 'expense' : 'income',
  });
  const shown = hidden ? maskAmount(amount) : amount;

  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={[title, meta, hidden ? t('home.amountHidden') : amount, tag]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={t('history.jar.open')}
      onPress={onPress}
      style={styles.row}
    >
      <View style={[styles.tile, { backgroundColor: tile.bg }]}>
        <JarIcon color={tile.fg} />
        <View style={styles.badge}>
          <JarMoveIcon move={move.move} color={move.move === 'done' ? color.good : color.ink} />
        </View>
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={styles.metaLine}>
          <Text numberOfLines={1} style={styles.meta}>
            {meta}
          </Text>
          {tag ? <Text style={styles.tag}>{tag}</Text> : null}
        </View>
      </View>
      <Text style={styles.amount}>{shown}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 68,
    paddingLeft: 12,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tile: {
    width: size.rowIcon,
    height: size.rowIcon,
    borderRadius: radius.tile,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.white,
    boxShadow: shadow.rowBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...text.rowTitle, color: color.ink },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  meta: { ...text.meta, flexShrink: 1, color: color.muted },
  tag: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: savingsColor.doneTag,
    fontFamily: fontFamily.extrabold,
    fontSize: 11,
    lineHeight: 20,
    color: color.good,
  },
  // The board's lighter grey is under 4.5:1 at 16px; muted is the nearest that passes.
  amount: { ...text.rowTitle, color: color.muted, fontVariant: ['tabular-nums'] },
});
