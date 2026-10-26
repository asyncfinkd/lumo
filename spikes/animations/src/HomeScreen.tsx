import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { DigitRoll } from './DigitRoll';
import { CameInIcon, CategoryIcon, WentOutIcon } from './Icons';
import { ease, Fill, Rise } from './motion';
import { type CategoryId, categories, color, font, sample, shadow } from './theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Mini trend line: ".draw" strokes it in, ".fadein" brings in the area under it.
function Sparkline({ id, line, area, length, tint, fillOpacity, runKey }: {
  id: string; line: string; area: string; length: number; tint: string; fillOpacity: number; runKey: number;
}) {
  const reduceMotion = useReducedMotion();
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const fade = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      draw.value = 1;
      fade.value = 1;
      return;
    }
    draw.value = 0;
    fade.value = 0;
    draw.value = withDelay(600, withTiming(1, { duration: 900, easing: ease.rise }));
    fade.value = withDelay(900, withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }));
  }, [runKey, reduceMotion, draw, fade]);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));
  const areaProps = useAnimatedProps(() => ({ opacity: fade.value }));
  return (
    <Svg width={60} height={30} viewBox="0 0 60 30">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor={tint} stopOpacity={fillOpacity} />
          <Stop offset={1} stopColor={tint} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <AnimatedPath d={area} fill={`url(#${id})`} animatedProps={areaProps} />
      <AnimatedPath
        d={line}
        stroke={tint}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={`${length} ${length}`}
        animatedProps={lineProps}
      />
    </Svg>
  );
}

function Money({ value, size = 22 }: { value: string; size?: number }) {
  return (
    <Text style={[styles.statValue, { fontSize: size }]}>
      <Text style={styles.statSymbol}>₾</Text>
      {value}
    </Text>
  );
}

function Row({ id, title, meta, amount }: { id: CategoryId; title: string; meta: string; amount: string }) {
  const c = categories[id];
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: c.bg }]}>
        <CategoryIcon id={id} color={c.fg} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      <Text style={styles.rowAmount}>{amount}</Text>
    </View>
  );
}

export function HomeScreen({ runKey }: { runKey: number }) {
  return (
    <View style={styles.main}>
      <Rise runKey={runKey} style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>N</Text>
        </View>
        <View>
          <Text style={styles.greet}>Good evening, Nika 🌙</Text>
          <Text style={styles.greetSub}>You're doing great this month.</Text>
        </View>
      </Rise>

      <Rise runKey={runKey} delay={60} style={styles.hero}>
        <View style={styles.heroLabelRow}>
          <Text style={styles.heroLabel}>Left to spend</Text>
        </View>
        <View style={styles.heroAmount}>
          <DigitRoll minor={sample.leftToSpendMinor} runKey={runKey} />
          <Text style={styles.of}>of ₾2,650</Text>
        </View>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Budget left" accessibilityValue={{ min: 0, max: 100, now: 30 }}>
          <Fill pct={30} runKey={runKey} style={{ backgroundImage: 'linear-gradient(90deg, #F7A27F, #F2845C)' }} />
        </View>
        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>70% spent</Text>
          <Text style={styles.heroMetaText}>5 days left</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Total balance</Text>
          <Text style={styles.balanceValue}>₾12,480.50</Text>
        </View>
      </Rise>

      <Rise runKey={runKey} delay={120} style={styles.stats}>
        <View style={styles.stat}>
          <View style={styles.statHead}>
            <View style={[styles.statIcon, { backgroundColor: '#DDEEE3' }]}>
              <CameInIcon color="#4E8A6A" />
            </View>
            <Text style={styles.statLabel}>Came in</Text>
          </View>
          <View style={styles.statBody}>
            <Money value="3,800" />
            <Sparkline
              id="gIn"
              runKey={runKey}
              tint="#6BAF8D"
              fillOpacity={0.28}
              length={58.15}
              line="M3 24 C12 24 16 21 24 20 S36 14 42 10 S52 6 57 6"
              area="M3 24 C12 24 16 21 24 20 S36 14 42 10 S52 6 57 6 L57 30 L3 30 Z"
            />
          </View>
        </View>
        <View style={styles.stat}>
          <View style={styles.statHead}>
            <View style={[styles.statIcon, { backgroundColor: '#F2E9E2' }]}>
              <WentOutIcon color="#8C6F5E" />
            </View>
            <Text style={styles.statLabel}>Went out</Text>
          </View>
          <View style={styles.statBody}>
            <Money value="3,000" />
            <Sparkline
              id="gOut"
              runKey={runKey}
              tint="#B89C8A"
              fillOpacity={0.3}
              length={57.44}
              line="M3 22 C10 21 14 15 22 15 S34 18 40 13 S51 8 57 8"
              area="M3 22 C10 21 14 15 22 15 S34 18 40 13 S51 8 57 8 L57 30 L3 30 Z"
            />
          </View>
        </View>
      </Rise>

      <Rise runKey={runKey} delay={240} style={styles.recent}>
        <View style={styles.sectionHead}>
          <Text style={[styles.h2, { paddingHorizontal: 0 }]}>Today</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>
        <View style={[styles.list, { boxShadow: shadow.card }]}>
          <Row id="coffee" title="Coffee Lab" meta="Coffee · 8:40" amount="−₾11.50" />
          <Row id="groceries" title="Fresh Market" meta="Groceries · 13:15" amount="−₾64.20" />
          <Row id="transport" title="Bolt" meta="Getting around · 18:20" amount="−₾12.40" />
        </View>

        <Text style={[styles.h2, { marginTop: 20 }]}>Yesterday</Text>
        <View style={styles.list}>
          <Row id="bills" title="Gym" meta="Bills · monthly bill" amount="−₾70.00" />
        </View>
      </Rise>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { paddingTop: 59, paddingHorizontal: 24, paddingBottom: 140 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE7A6',
    boxShadow: shadow.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: font.extrabold, color: color.ink },
  greet: { fontSize: 20, lineHeight: 26, fontFamily: font.bold, letterSpacing: -0.2, color: color.ink },
  greetSub: { fontSize: 14, lineHeight: 18, fontFamily: font.semibold, color: color.muted },

  hero: {
    marginTop: 16,
    borderRadius: 36,
    borderCurve: 'continuous',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    backgroundImage: 'linear-gradient(150deg, rgba(255,241,204,0.45) 0%, rgba(255,255,255,0) 70%)',
    boxShadow: shadow.hero,
  },
  heroLabelRow: { height: 28, justifyContent: 'center' },
  heroLabel: { fontSize: 15, fontFamily: font.bold, color: color.muted },
  heroAmount: { marginTop: 2, height: 50, flexDirection: 'row', alignItems: 'flex-end' },
  of: { fontSize: 15, lineHeight: 15, fontFamily: font.semibold, color: color.muted, marginLeft: 8, marginBottom: 9 },
  track: { marginTop: 12, height: 10, borderRadius: 999, backgroundColor: color.track, overflow: 'hidden' },
  heroMeta: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  heroMetaText: { fontSize: 12, fontFamily: font.bold, color: color.muted, fontVariant: ['tabular-nums'] },
  balanceRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 13, fontFamily: font.semibold, color: color.muted },
  balanceValue: { fontSize: 13, fontFamily: font.bold, color: color.ink, fontVariant: ['tabular-nums'] },

  stats: { marginTop: 12, flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    borderRadius: 28,
    borderCurve: 'continuous',
    padding: 14,
    gap: 8,
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: { width: 32, height: 32, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 14, fontFamily: font.bold, color: color.muted },
  statBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  statValue: { lineHeight: 28, fontFamily: font.bold, letterSpacing: -0.3, color: color.ink, fontVariant: ['tabular-nums'] },
  statSymbol: { fontSize: 15, color: color.subtle },

  recent: { marginTop: 24, gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  h2: { paddingHorizontal: 4, fontSize: 17, fontFamily: font.bold, color: color.ink },
  seeAll: { fontSize: 15, fontFamily: font.bold, color: color.muted },
  list: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: color.card,
  },
  row: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: { width: 48, height: 48, borderRadius: 16, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 16, lineHeight: 21, fontFamily: font.bold, color: color.ink },
  rowMeta: { fontSize: 13, lineHeight: 17, fontFamily: font.semibold, color: color.muted },
  rowAmount: { fontSize: 16, fontFamily: font.bold, color: color.ink, fontVariant: ['tabular-nums'] },
});
