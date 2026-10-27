import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { CloseIcon } from '@/components/Icons';
import { Jar } from '@/components/Jar';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { db } from '@/db/client';
import { currencies, formatMoney } from '@/domain/money';
import { useJarEntries, useJars, useMoneyMonth } from '@/features/live';
import { useJarDrop } from '@/features/savings/dropStore';
import { addToJar, takeFromJar } from '@/features/savings/repo';
import {
  jarPace,
  jarPercent,
  quickAmounts,
  savedByJar,
  takeOutAmounts,
} from '@/features/savings/savings';
import { useMonthName } from '@/features/savings/useMonthName';
import { color, fontFamily, radius, savingsColor, shadow, size, text } from '@/theme';

// "Add to New laptop" (SavingsAdd): pick an amount, see where the jar lands,
// drop it in. A drop that fills the jar opens "You did it" (SavingsDone).
// With `mode=out` the same sheet takes money out, back to the balance.
export default function SavingsAddScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { jar: jarId, mode } = useLocalSearchParams<{ jar: string; mode?: 'out' }>();
  const out = mode === 'out';
  const { today, summary } = useMoneyMonth();
  const jar = useJars().find((j) => j.id === jarId);
  const savedMinor = savedByJar(useJarEntries()).get(jarId) ?? 0;
  const monthName = useMonthName(today);
  const showDrop = useJarDrop((s) => s.show);
  const [chosen, setAmountMinor] = useState<number | null>(null);
  // Where to go once the sheet has slid away.
  const filled = useRef(false);

  if (!jar) return null;
  const money = (minor: number) => formatMoney(minor, jar.currency, { decimals: 'auto' });
  const chips = out
    ? takeOutAmounts(jar.monthlyMinor, savedMinor)
    : quickAmounts(jar.monthlyMinor).map((c) => ({ ...c, all: false }));
  // ₾100 to start with, or the first amount the jar can give back.
  const amountMinor = chosen ?? chips.find((c) => c.minor === 10000)?.minor ?? chips[0]?.minor ?? 0;
  const pct = jarPercent(savedMinor, jar.goalMinor);
  const after = out ? savedMinor - amountMinor : savedMinor + amountMinor;
  const afterPct = jarPercent(after, jar.goalMinor);
  const left = Math.max(0, jar.goalMinor - after);
  const pace = jarPace(jar, after, today);
  const symbol = currencies[jar.currency].symbol;
  const amountText = formatMoney(amountMinor, jar.currency, { decimals: 'auto' }).slice(
    symbol.length,
  );

  const dropIn = (close: () => void) => {
    if (amountMinor <= 0) return;
    if (out) {
      takeFromJar(db, jar.id, amountMinor, today);
      showDrop({ jarId: jar.id, amountMinor, from: pct, to: afterPct, out: true });
      close();
      return;
    }
    addToJar(db, jar.id, amountMinor, today);
    if (after >= jar.goalMinor) {
      filled.current = true;
    } else {
      showDrop({ jarId: jar.id, amountMinor, from: pct, to: afterPct });
    }
    close();
  };

  return (
    <Sheet
      accessibilityLabel={t(out ? 'savings.outSheet.title' : 'savings.addSheet.title', {
        name: jar.name,
      })}
      onDismissed={() =>
        filled.current
          ? router.replace({
              pathname: '/savings-done',
              params: {
                jar: jar.id,
                name: jar.name,
                tone: jar.tone,
                saved: String(after),
                currency: jar.currency,
                start: jar.startDate,
              },
            })
          : router.back()
      }
    >
      {(close) => (
        <>
          <View style={styles.header}>
            <Jar pct={pct} size={40} tone={jar.tone} label={false} />
            <View style={styles.headerText}>
              <Text accessibilityRole="header" style={styles.title}>
                {t(out ? 'savings.outSheet.title' : 'savings.addSheet.title', { name: jar.name })}
              </Text>
              <Text style={styles.sub}>
                {t('savings.ofBoth', { saved: money(savedMinor), goal: money(jar.goalMinor) })}
              </Text>
            </View>
            <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
              <CloseIcon color={color.muted} />
            </Press>
          </View>

          <View accessible accessibilityLabel={money(amountMinor)} style={styles.amount}>
            <Text style={styles.symbol}>{symbol}</Text>
            <Text style={styles.digits}>{amountText}</Text>
          </View>

          <View accessibilityRole="radiogroup" style={styles.chips}>
            {chips.map((chip) => {
              const on = chip.minor === amountMinor;
              return (
                <Press
                  key={chip.minor}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={
                    chip.usual || chip.all
                      ? `${money(chip.minor)}, ${t(chip.all ? 'savings.outSheet.all' : 'savings.addSheet.usual')}`
                      : money(chip.minor)
                  }
                  onPress={() => setAmountMinor(chip.minor)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={styles.chipLabel}>{money(chip.minor)}</Text>
                  <Text style={styles.chipNote}>
                    {chip.all
                      ? t('savings.outSheet.all')
                      : chip.usual
                        ? t('savings.addSheet.usual')
                        : ''}
                  </Text>
                </Press>
              );
            })}
          </View>

          <View style={styles.after}>
            <View style={styles.afterTop}>
              <Text style={styles.afterLabel}>{t('savings.addSheet.after')}</Text>
              <Text style={styles.afterValue}>
                {t('savings.addSheet.afterValue', { percent: afterPct, left: money(left) })}
              </Text>
            </View>
            <View style={styles.track}>
              {/* The lighter part is what this adds, or what it takes out. */}
              <View
                style={[styles.fill, styles.afterFill, { width: `${Math.max(pct, afterPct)}%` }]}
              />
              <View
                style={[styles.fill, styles.nowFill, { width: `${Math.min(pct, afterPct)}%` }]}
              />
            </View>
            <Text style={styles.pace}>
              {pace.type === 'full'
                ? t('savings.addSheet.fills')
                : pace.type === 'ahead'
                  ? t('savings.paceAhead')
                  : t(out ? 'savings.outSheet.readyBy' : 'savings.addSheet.onTrack', {
                      month: monthName(pace.year, pace.month),
                    })}
            </Text>
          </View>

          {summary?.balanceMinor != null ? (
            <Text style={styles.balance}>
              {t(out ? 'savings.outSheet.toBalance' : 'savings.addSheet.fromBalance', {
                amount: money(summary.balanceMinor),
              })}
            </Text>
          ) : null}

          <Button
            label={t(out ? 'savings.outSheet.take' : 'savings.addSheet.drop', {
              amount: money(amountMinor),
            })}
            disabled={amountMinor <= 0}
            onPress={() => dropIn(close)}
            style={styles.drop}
          />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 26, color: color.ink },
  sub: { ...text.meta, color: color.muted, fontVariant: ['tabular-nums'] },
  close: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  symbol: {
    marginRight: 4,
    marginBottom: 9,
    fontFamily: fontFamily.extrabold,
    fontSize: 30,
    lineHeight: 30,
    color: color.placeholder,
  },
  digits: {
    fontFamily: fontFamily.extrabold,
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -1.5,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  chips: { marginTop: 20, flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  chipOn: { backgroundColor: savingsColor.chipOn, boxShadow: shadow.jarChip },
  chipLabel: {
    fontFamily: fontFamily.extrabold,
    fontSize: 16,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  chipNote: {
    height: 12,
    fontFamily: fontFamily.extrabold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.2,
    color: savingsColor.chipNote,
  },
  after: {
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: savingsColor.afterBg,
    gap: 10,
  },
  afterTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  afterLabel: { fontFamily: fontFamily.bold, fontSize: 14, color: savingsColor.afterLabel },
  afterValue: {
    fontFamily: fontFamily.extrabold,
    fontSize: 15,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: savingsColor.afterTrack,
    overflow: 'hidden',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill },
  afterFill: { backgroundColor: savingsColor.afterFill },
  nowFill: { backgroundColor: savingsColor.nowFill },
  pace: { fontFamily: fontFamily.bold, fontSize: 13, color: savingsColor.paceText },
  balance: {
    ...text.meta,
    marginTop: 14,
    textAlign: 'center',
    color: color.subtle,
    fontVariant: ['tabular-nums'],
  },
  drop: { marginTop: 14 },
});
