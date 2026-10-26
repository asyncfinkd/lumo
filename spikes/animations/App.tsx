import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurTargetView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import {
  useFonts,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { AddSheet } from './src/AddSheet';
import { DigitRoll } from './src/DigitRoll';
import { Donut } from './src/Donut';
import { FpsMeter } from './src/FpsMeter';
import { GlassTabBar, type Tab } from './src/GlassTabBar';
import { Press } from './src/Press';
import { categories, type CategoryId, color, font, sample, springs } from './src/theme';

// Soft butter and peach light behind every screen, as in the design.
function Orbs() {
  const { width, height } = useWindowDimensions();
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="butter" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color.orbButter} stopOpacity={0.9} />
          <Stop offset="1" stopColor={color.orbButter} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="peach" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color.orbPeach} stopOpacity={0.75} />
          <Stop offset="1" stopColor={color.orbPeach} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="15%" cy="12%" rx="260" ry="240" fill="url(#butter)" />
      <Ellipse cx="95%" cy="92%" rx="280" ry="260" fill="url(#peach)" />
    </Svg>
  );
}

// A bar that grows from 0 to its width, like the design's ".fill".
function Fill({ pct, tint, runKey, delay = 450 }: { pct: number; tint: string; runKey: number; delay?: number }) {
  const reduceMotion = useReducedMotion();
  const w = useSharedValue(reduceMotion ? pct : 0);
  useEffect(() => {
    if (reduceMotion) {
      w.value = pct;
      return;
    }
    w.value = 0;
    w.value = withDelay(delay, withSpring(pct, { damping: 16, stiffness: 90 }));
  }, [pct, runKey, delay, reduceMotion, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[styles.fill, { backgroundColor: tint }, style]} />;
}

function Home({ runKey }: { runKey: number }) {
  return (
    <>
      <View style={styles.greetRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>N</Text>
        </View>
        <View>
          <Text style={styles.greet}>Good evening, Nika</Text>
          <Text style={styles.sub}>You're doing great this month.</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Left to spend</Text>
        <View style={styles.heroRow}>
          <DigitRoll minor={sample.leftToSpendMinor} runKey={runKey} />
          <Text style={styles.of}>of ₾2,650</Text>
        </View>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: 30 }}>
          <Fill pct={30} tint={color.accent} runKey={runKey} />
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>70% spent</Text>
          <Text style={styles.meta}>5 days left</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Total balance</Text>
          <Text style={styles.balance}>₾12,480.50</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Came in</Text>
          <Text style={styles.statValue}>₾3,800</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Went out</Text>
          <Text style={styles.statValue}>₾3,000</Text>
        </View>
      </View>

      <Text style={styles.h2}>Today</Text>
      <View style={styles.list}>
        {[
          ['Coffee Lab', 'Coffee · 8:40', '−₾11.50', 'coffee'],
          ['Fresh Market', 'Groceries · 13:15', '−₾64.20', 'groceries'],
          ['Bolt', 'Getting around · 18:20', '−₾12.40', 'transport'],
          ['Gym', 'Bills · monthly bill', '−₾70.00', 'bills'],
        ].map(([title, meta, amount, id]) => (
          <View key={title} style={styles.item}>
            <View style={[styles.itemIcon, { backgroundColor: categories[id as CategoryId].bg }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{title}</Text>
              <Text style={styles.itemMeta}>{meta}</Text>
            </View>
            <Text style={styles.itemAmount}>{amount}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function Insights({ runKey }: { runKey: number }) {
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [segW, setSegW] = useState(0);
  const thumb = useSharedValue(0);
  useEffect(() => {
    thumb.value = withSpring(period === 'week' ? 0 : segW, springs.thumb);
  }, [period, segW, thumb]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumb.value }] }));

  const items = period === 'month' ? sample.month : sample.week;
  const max = items[0][1];
  const total = items.reduce((s, [, v]) => s + v, 0);

  return (
    <>
      <Text style={styles.h1}>Insights</Text>
      <Text style={styles.sub}>Where your money went, gently.</Text>

      <View style={styles.segment} onLayout={(e) => setSegW((e.nativeEvent.layout.width - 8) / 2)}>
        {segW > 0 && <Animated.View style={[styles.segThumb, { width: segW }, thumbStyle]} />}
        {(['week', 'month'] as const).map((p) => (
          <Press
            key={p}
            accessibilityRole="radio"
            accessibilityState={{ checked: period === p }}
            onPress={() => setPeriod(p)}
            style={styles.segItem}
          >
            <Text style={[styles.segText, { color: period === p ? color.ink : color.muted }]}>
              {p === 'week' ? 'Week' : 'Month'}
            </Text>
          </Press>
        ))}
      </View>

      <View style={styles.card}>
        <Donut items={items} label={period === 'month' ? 'spent this month' : 'spent this week'} runKey={runKey + (period === 'week' ? 1000 : 0)} />
      </View>

      <Text style={styles.h2}>By category</Text>
      <View style={styles.list}>
        {items.map(([id, v]) => (
          <View key={id} style={styles.catRow}>
            <View style={[styles.itemIcon, { backgroundColor: categories[id].bg }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.catTop}>
                <Text style={styles.itemTitle}>{categories[id].name}</Text>
                <Text style={styles.itemAmount}>
                  ₾{(v / 100).toLocaleString('en-US', { minimumFractionDigits: v % 100 ? 2 : 0, maximumFractionDigits: 2 })}{' '}
                  <Text style={styles.itemMeta}>{Math.round((v / total) * 100)}%</Text>
                </Text>
              </View>
              <View style={styles.thinTrack}>
                <Fill pct={Math.max((v / max) * 100, 6)} tint={categories[id].color} runKey={runKey + (period === 'week' ? 1000 : 0)} delay={300} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const [tab, setTab] = useState<Tab>('home');
  const [sheet, setSheet] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const blurTarget = useRef<ComponentRef<typeof View>>(null);

  // Fade the screen when switching tabs.
  const fade = useSharedValue(1);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const switchTab = (next: Tab) => {
    if (next === tab || (next !== 'home' && next !== 'insights')) return;
    fade.value = 0;
    fade.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
    setTab(next);
    setRunKey((k) => k + 1);
  };

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={styles.root}>
          <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
            <Orbs />
            <Animated.View style={[{ flex: 1 }, fadeStyle]}>
              <ScrollView contentContainerStyle={styles.content}>
                {tab === 'home' ? <Home runKey={runKey} /> : <Insights runKey={runKey} />}
                <Press accessibilityRole="button" onPress={() => setRunKey((k) => k + 1)} style={styles.replay}>
                  <Text style={styles.replayText}>Replay animations</Text>
                </Press>
              </ScrollView>
            </Animated.View>
          </BlurTargetView>

          <GlassTabBar active={tab} onChange={switchTab} onAdd={() => setSheet(true)} blurTarget={blurTarget} />
          {sheet && <AddSheet blurTarget={blurTarget} onClosed={() => setSheet(false)} />}
          <FpsMeter />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { paddingTop: 96, paddingHorizontal: 24, paddingBottom: 140 },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFE9B8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontFamily: font.extrabold, color: color.ink },
  greet: { fontSize: 17, fontFamily: font.bold, color: color.ink },
  h1: { fontSize: 28, fontFamily: font.extrabold, color: color.ink, letterSpacing: -0.4 },
  h2: { marginTop: 24, marginBottom: 8, paddingHorizontal: 4, fontSize: 17, fontFamily: font.bold, color: color.ink },
  sub: { fontSize: 14, fontFamily: font.semibold, color: color.muted },
  hero: { marginTop: 16, borderRadius: 36, padding: 20, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' },
  heroLabel: { fontSize: 15, fontFamily: font.bold, color: color.muted },
  heroRow: { marginTop: 2, flexDirection: 'row', alignItems: 'flex-end' },
  of: { fontSize: 15, fontFamily: font.semibold, color: color.muted, marginLeft: 8, marginBottom: 9 },
  track: { marginTop: 12, height: 10, borderRadius: 999, backgroundColor: color.track, overflow: 'hidden' },
  thinTrack: { height: 8, borderRadius: 999, backgroundColor: color.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  metaRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 12, fontFamily: font.bold, color: color.muted },
  balanceRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 13, fontFamily: font.semibold, color: color.muted },
  balance: { fontSize: 13, fontFamily: font.bold, color: color.ink, fontVariant: ['tabular-nums'] },
  stats: { marginTop: 12, flexDirection: 'row', gap: 12 },
  stat: { flex: 1, borderRadius: 28, padding: 14, backgroundColor: color.card, gap: 8 },
  statLabel: { fontSize: 14, fontFamily: font.bold, color: color.muted },
  statValue: { fontSize: 22, fontFamily: font.bold, color: color.ink, fontVariant: ['tabular-nums'] },
  list: { borderRadius: 28, paddingHorizontal: 12, paddingVertical: 2, backgroundColor: color.card },
  item: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 14 },
  catRow: { height: 72, flexDirection: 'row', alignItems: 'center', gap: 14 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between' },
  itemIcon: { width: 44, height: 44, borderRadius: 14 },
  itemTitle: { fontSize: 16, fontFamily: font.bold, color: color.ink },
  itemMeta: { fontSize: 13, fontFamily: font.semibold, color: color.muted },
  itemAmount: { fontSize: 16, fontFamily: font.bold, color: color.ink, fontVariant: ['tabular-nums'] },
  card: { marginTop: 16, borderRadius: 32, paddingVertical: 20, backgroundColor: color.card },
  segment: { marginTop: 16, height: 44, padding: 4, borderRadius: 999, backgroundColor: color.card, flexDirection: 'row' },
  segThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999, backgroundColor: color.track },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 15, fontFamily: font.bold },
  replay: { marginTop: 24, height: 44, borderRadius: 999, alignSelf: 'center', paddingHorizontal: 18, justifyContent: 'center', backgroundColor: 'rgba(43,37,34,0.06)' },
  replayText: { fontSize: 14, fontFamily: font.bold, color: color.muted },
});
