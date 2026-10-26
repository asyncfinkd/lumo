import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { BlurTarget } from './GlassTabBar';
import { BackspaceIcon, CalendarIcon, CloseIcon, NoteIcon } from './Icons';
import { ease } from './motion';
import { Press } from './Press';
import { color, font, shadow } from './theme';

type Kind = 'expense' | 'income';
type Cat = { id: string; label: string; bg: string; sel: string; fg: string; left: number; word: string; emoji: string };

// "left" is from docs/sample-data.md budgets, in tetri.
const EXPENSE: Cat[] = [
  { id: 'coffee', label: 'Coffee', bg: '#F3E6DA', sel: '#EBD5C1', fg: '#946649', left: 7140, word: 'coffee', emoji: '☕' },
  { id: 'groceries', label: 'Groceries', bg: '#FFF0C7', sel: '#FFE39A', fg: '#A0761C', left: 8760, word: 'groceries', emoji: '🧺' },
  { id: 'transport', label: 'Getting around', bg: '#DCEBF8', sel: '#C7DDF3', fg: '#4A7EAD', left: 11400, word: 'getting around', emoji: '🚲' },
  { id: 'treats', label: 'Treats', bg: '#FBDDE3', sel: '#F6C8D3', fg: '#B9566E', left: 9670, word: 'treats', emoji: '🍰' },
  { id: 'bills', label: 'Bills', bg: '#DDEEE3', sel: '#C8E4D2', fg: '#4E8A6A', left: 0, word: 'bills', emoji: '💡' },
  { id: 'home', label: 'Home', bg: '#ECE6F7', sel: '#DDD3F1', fg: '#7A62A8', left: 0, word: 'home', emoji: '🏡' },
];
const INCOME: Cat[] = [
  { id: 'salary', label: 'Salary', bg: '#DDEEE3', sel: '#C8E4D2', fg: '#4E8A6A', left: 0, word: '', emoji: '' },
  { id: 'freelance', label: 'Freelance', bg: '#DCEBF8', sel: '#C7DDF3', fg: '#4A7EAD', left: 0, word: '', emoji: '' },
  { id: 'gift', label: 'Gift', bg: '#FBDDE3', sel: '#F6C8D3', fg: '#B9566E', left: 0, word: '', emoji: '' },
  { id: 'refund', label: 'Refund', bg: '#FFF0C7', sel: '#FFE39A', fg: '#A0761C', left: 0, word: '', emoji: '' },
];
const KEY_ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', 'back']];

// Keypad text to tetri without floats (ADR 0003).
function toMinor(text: string) {
  const [whole, frac = ''] = text.split('.');
  return Number(whole || '0') * 100 + Number((frac + '00').slice(0, 2));
}

const fmt = (minor: number) => (minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function pressKey(current: string, key: string) {
  if (key === 'back') return current.length > 1 ? current.slice(0, -1) : '0';
  if (key === '.') return current.includes('.') ? current : current + '.';
  const dot = current.indexOf('.');
  if (dot >= 0 && current.length - dot > 2) return current;
  if (dot < 0 && current.replace(/^0/, '').length >= 6) return current;
  return current === '0' ? key : current + key;
}

type Props = { blurTarget: BlurTarget; onClosed: () => void };

export function AddSheet({ blurTarget, onClosed }: Props) {
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const sheetH = height - 96;

  const [kind, setKind] = useState<Kind>('expense');
  const [amount, setAmount] = useState('24.50');
  const [cat, setCat] = useState('coffee');
  const [segW, setSegW] = useState(0);

  const y = useSharedValue(reduceMotion ? 0 : sheetH);
  const scrim = useSharedValue(reduceMotion ? 1 : 0);
  const thumb = useSharedValue(0);
  const caret = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    // .sheet: sheetUp .7s cubic-bezier(.32,1.15,.5,1) · .scrim: .5s ease-out
    y.value = withTiming(0, { duration: 700, easing: ease.sheet });
    scrim.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    // .caret: blink 1.1s steps(1)
    caret.value = withRepeat(
      withSequence(withDelay(550, withTiming(0, { duration: 0 })), withDelay(550, withTiming(1, { duration: 0 }))),
      -1,
    );
  }, [caret, reduceMotion, scrim, y]);

  const dismiss = (duration: number) => {
    'worklet';
    scrim.value = withTiming(0, { duration });
    y.value = withTiming(sheetH, { duration, easing: Easing.in(Easing.quad) }, (done) => {
      if (done) scheduleOnRN(onClosed);
    });
  };
  const close = () => dismiss(280);

  // Drag down to dismiss; small drags snap back.
  const pan = usePanGesture({
    activeOffsetY: 10,
    onUpdate: (e) => {
      'worklet';
      y.value = Math.max(0, e.translationY);
      scrim.value = 1 - Math.min(1, y.value / sheetH);
    },
    onDeactivate: (e) => {
      'worklet';
      if (e.translationY > 140 || e.velocityY > 900) {
        dismiss(220);
      } else {
        y.value = withTiming(0, { duration: 450, easing: ease.sheet });
        scrim.value = withTiming(1, { duration: 200 });
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumb.value }] }));
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  const pickKind = (k: Kind) => {
    setKind(k);
    setCat(k === 'expense' ? EXPENSE[0].id : INCOME[0].id);
    // transform .45s cubic-bezier(.34,1.3,.64,1)
    thumb.value = withTiming(k === 'expense' ? 0 : segW, { duration: 450, easing: ease.thumb });
  };

  const list = kind === 'expense' ? EXPENSE : INCOME;
  const current = list.find((c) => c.id === cat) ?? list[0];
  const value = toMinor(amount);
  const [whole, frac] = amount.split('.');
  const amountText = Number(whole || '0').toLocaleString('en-US') + (frac !== undefined ? '.' + frac : '');

  let message = 'Lovely! That goes straight to your balance 🌿';
  let calm = false;
  if (kind === 'expense') {
    if (current.left === 0) {
      message = `${current.label} already covered this month ${current.emoji}`;
      calm = true;
    } else if (current.left - value >= 0) {
      message = `Nice! Still ₾${fmt(current.left - value)} left for ${current.word} ${current.emoji}`;
    } else {
      message = `₾${fmt(value - current.left)} over on ${current.word} — that’s okay 🤍`;
      calm = true;
    }
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        {/* backdrop-filter: blur(6px); no tint, the scrim color below is the design's. */}
        <BlurView intensity={30} blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" style={StyleSheet.absoluteFill} />
        <Press accessibilityLabel="Close" onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(43,37,34,0.22)' }]} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View accessibilityViewIsModal style={[styles.sheet, { height: sheetH }, sheetStyle]}>
          <View style={styles.sheetGlass}>
            <BlurView intensity={100} blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,252,248,0.9)' }]} />
          </View>

          <View style={styles.grabber} />

          <View style={styles.header}>
            <Press accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.close}>
              <CloseIcon color={color.muted} />
            </Press>
            <Text style={styles.title}>{kind === 'expense' ? 'New expense' : 'New income'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View accessibilityRole="radiogroup" accessibilityLabel="Type" style={styles.segment} onLayout={(e) => setSegW((e.nativeEvent.layout.width - 8) / 2)}>
            <Animated.View style={[styles.segThumb, { width: segW || '50%' }, thumbStyle]} />
            {(['expense', 'income'] as Kind[]).map((k) => (
              <Press key={k} accessibilityRole="radio" accessibilityState={{ checked: kind === k }} onPress={() => pickKind(k)} style={styles.segItem}>
                <Text style={[styles.segText, { color: kind === k ? color.ink : color.muted }]}>{k === 'expense' ? 'Expense' : 'Income'}</Text>
              </Press>
            ))}
          </View>

          <View accessible accessibilityRole="text" accessibilityLabel={`Amount ${amountText} lari`} style={styles.amountRow}>
            <Text style={styles.amountSymbol}>₾</Text>
            <Text style={styles.amount}>{amountText}</Text>
            <Animated.View style={[styles.caret, caretStyle]} />
          </View>

          <View style={styles.msgWrap}>
            <View style={[styles.msg, { backgroundColor: calm ? color.calmSoft : color.goodSoft }]}>
              <Text style={[styles.msgText, { color: calm ? color.muted : color.good }]}>{message}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
            {list.map((c) => {
              const on = c.id === current.id;
              return (
                <Press
                  key={c.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setCat(c.id)}
                  style={[
                    styles.chip,
                    on
                      ? { backgroundColor: c.sel, boxShadow: `inset 0px 0px 0px 1px rgba(255,255,255,0.7), 0px 4px 12px -6px ${c.fg}55` }
                      : { backgroundColor: 'rgba(43,37,34,0.05)' },
                  ]}
                >
                  <View style={[styles.chipDot, { backgroundColor: on ? 'rgba(255,255,255,0.75)' : c.bg }]}>
                    <View style={[styles.chipDotInner, { backgroundColor: c.fg }]} />
                  </View>
                  <Text style={styles.chipText}>{c.label}</Text>
                </Press>
              );
            })}
          </ScrollView>

          <View style={styles.extras}>
            <Press style={styles.extra}>
              <CalendarIcon color={color.muted} />
              <Text style={[styles.extraText, { color: color.ink }]}>Today, Oct 31</Text>
            </Press>
            <Press style={styles.extra}>
              <NoteIcon color={color.muted} />
              <Text style={[styles.extraText, { color: color.muted }]}>Add a note</Text>
            </Press>
          </View>

          <View style={styles.keys}>
            {KEY_ROWS.map((row) => (
              <View key={row.join()} style={styles.keyRow}>
                {row.map((k) => (
                  <Press
                    key={k}
                    haptic
                    accessibilityRole="button"
                    accessibilityLabel={k === 'back' ? 'Delete' : k === '.' ? 'Decimal point' : k}
                    onPress={() => setAmount((a) => pressKey(a, k))}
                    style={styles.key}
                  >
                    {k === 'back' ? <BackspaceIcon color={color.ink} /> : <Text style={styles.keyText}>{k}</Text>}
                  </Press>
                ))}
              </View>
            ))}
          </View>

          <Press haptic accessibilityRole="button" onPress={close} style={styles.cta}>
            <Text style={styles.ctaText}>{kind === 'expense' ? 'Add expense' : 'Add income'}</Text>
          </Press>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 34,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderCurve: 'continuous',
    boxShadow: shadow.sheet,
  },
  sheetGlass: { ...StyleSheet.absoluteFill, borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden' },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: '#E2D8CF' },
  header: { marginTop: 10, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(43,37,34,0.05)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: font.bold, color: color.ink },
  segment: { marginTop: 14, height: 52, padding: 4, borderRadius: 999, backgroundColor: color.track, flexDirection: 'row' },
  segThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999, backgroundColor: '#FFFFFF', boxShadow: shadow.thumb },
  segItem: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 15, fontFamily: font.bold },
  amountRow: { marginTop: 22, height: 64, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  amountSymbol: { fontSize: 30, lineHeight: 30, fontFamily: font.semibold, color: color.subtle, marginRight: 4, marginBottom: 9 },
  amount: { fontSize: 56, lineHeight: 56, fontFamily: font.bold, color: color.ink, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  caret: { width: 3, height: 46, marginLeft: 4, marginBottom: 6, borderRadius: 999, backgroundColor: color.ink },
  msgWrap: { marginTop: 10, alignItems: 'center' },
  msg: { height: 30, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  msgText: { fontSize: 13, fontFamily: font.bold },
  chipsScroll: { marginTop: 20, marginHorizontal: -24, flexGrow: 0, overflow: 'visible' },
  chips: { paddingHorizontal: 24, gap: 8 },
  chip: { height: 44, paddingLeft: 12, paddingRight: 16, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chipDotInner: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 15, fontFamily: font.bold, color: color.ink },
  extras: { marginTop: 12, flexDirection: 'row', gap: 8 },
  extra: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(43,37,34,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  extraText: { fontSize: 14, fontFamily: font.bold },
  keys: { marginTop: 20, gap: 8 },
  keyRow: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1,
    height: 54,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.95)',
    boxShadow: shadow.key,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 24, fontFamily: font.bold, color: color.ink, fontVariant: ['tabular-nums'] },
  cta: { marginTop: 16, height: 56, borderRadius: 999, backgroundColor: color.ink, boxShadow: shadow.cta, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 17, fontFamily: font.bold, color: color.cream },
});
