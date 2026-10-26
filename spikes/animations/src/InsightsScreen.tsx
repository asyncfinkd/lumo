import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Donut } from './Donut';
import { CategoryIcon, SparkleIcon } from './Icons';
import { ease, Fill, Rise } from './motion';
import { Press } from './Press';
import { categories, color, font, sample, shadow } from './theme';

type Period = 'week' | 'month';

const DATA: Record<Period, { items: typeof sample.month; label: string; insight: string }> = {
  week: { items: sample.week, label: 'spent this week', insight: 'Groceries led this week. A few little store runs add up 🧺' },
  month: { items: sample.month, label: 'spent this month', insight: 'You spent 18% less on coffee than in September. Nice! ☕' },
};

// Totals drop ".00" only when whole (ADR 0003).
const money = (minor: number) =>
  (minor / 100).toLocaleString('en-US', { minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2 });

export function InsightsScreen({ runKey }: { runKey: number }) {
  const [period, setPeriod] = useState<Period>('month');
  const [segW, setSegW] = useState(0);
  const thumb = useSharedValue(0);

  useEffect(() => {
    if (!segW) return;
    thumb.value = withTiming(period === 'week' ? 0 : segW, { duration: 450, easing: ease.thumb });
  }, [period, segW, thumb]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumb.value }] }));

  const { items, label, insight } = DATA[period];
  const total = items.reduce((s, [, v]) => s + v, 0);
  const max = items[0][1];
  const drawKey = runKey * 10 + (period === 'week' ? 1 : 0);

  return (
    <View style={styles.main}>
      <Rise runKey={runKey} style={styles.header}>
        <Text style={styles.h1}>Insights</Text>
        <Text style={styles.sub}>Where your money went, gently.</Text>
      </Rise>

      <Rise runKey={runKey} delay={40}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Period" style={styles.segment} onLayout={(e) => setSegW((e.nativeEvent.layout.width - 8) / 2)}>
          <Animated.View style={[styles.segThumb, { width: segW || '50%', opacity: segW ? 1 : 0 }, thumbStyle]} />
          {(['week', 'month'] as Period[]).map((p) => (
            <Press key={p} accessibilityRole="radio" accessibilityState={{ checked: period === p }} onPress={() => setPeriod(p)} style={styles.segItem}>
              <Text style={[styles.segText, { color: period === p ? color.ink : color.muted }]}>{p === 'week' ? 'Week' : 'Month'}</Text>
            </Press>
          ))}
        </View>
      </Rise>

      <Rise runKey={runKey} delay={80} style={styles.chartCard}>
        <Donut items={items} label={label} runKey={drawKey} />
      </Rise>

      <Rise runKey={runKey} delay={120} style={styles.insight}>
        <View style={styles.insightIcon}>
          <SparkleIcon color="#A0761C" />
        </View>
        <Text style={styles.insightText}>{insight}</Text>
      </Rise>

      <Rise runKey={runKey} delay={160} style={styles.byCategory}>
        <Text style={styles.h2}>By category</Text>
        <View style={styles.list}>
          {items.map(([id, v]) => {
            const c = categories[id];
            return (
              <View key={id} style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: c.bg }]}>
                  <CategoryIcon id={id} size={22} color={c.fg} />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName}>{c.name}</Text>
                    <Text style={styles.rowAmount}>₾{money(v)}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <View style={styles.bar}>
                      <Fill pct={Math.max((v / max) * 100, 6)} runKey={drawKey} delay={200} duration={600} easing={ease.bar} style={{ backgroundColor: c.color }} />
                    </View>
                    <Text style={styles.pct}>{Math.round((v / total) * 100)}%</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </Rise>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 59, paddingHorizontal: 24, paddingBottom: 140 },
  header: { gap: 2 },
  h1: { fontSize: 28, lineHeight: 34, fontFamily: font.extrabold, letterSpacing: -0.4, color: color.ink },
  sub: { fontSize: 14, lineHeight: 18, fontFamily: font.semibold, color: color.muted },
  segment: {
    marginTop: 16,
    height: 52,
    padding: 4,
    borderRadius: 999,
    backgroundColor: color.card,
    boxShadow: shadow.card,
    flexDirection: 'row',
  },
  segThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999, backgroundColor: color.track },
  segItem: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 15, fontFamily: font.bold },
  chartCard: {
    marginTop: 16,
    borderRadius: 28,
    borderCurve: 'continuous',
    padding: 20,
    backgroundColor: color.card,
    boxShadow: shadow.card,
    alignItems: 'center',
  },
  insight: {
    marginTop: 12,
    borderRadius: 28,
    borderCurve: 'continuous',
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 14,
    paddingRight: 18,
    backgroundColor: '#FFF4DA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: { flex: 1, fontSize: 15, lineHeight: 21, fontFamily: font.bold, color: '#5E4714' },
  byCategory: { marginTop: 24, gap: 8 },
  h2: { paddingHorizontal: 4, fontSize: 17, fontFamily: font.bold, color: color.ink },
  list: {
    paddingVertical: 2,
    paddingHorizontal: 14,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  row: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0, gap: 7 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowName: { fontSize: 15, fontFamily: font.bold, color: color.ink },
  rowAmount: { fontSize: 15, fontFamily: font.bold, color: color.ink, fontVariant: ['tabular-nums'] },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1, height: 8, borderRadius: 999, backgroundColor: color.track, overflow: 'hidden' },
  pct: { width: 34, textAlign: 'right', fontSize: 12, fontFamily: font.bold, color: color.muted, fontVariant: ['tabular-nums'] },
});
