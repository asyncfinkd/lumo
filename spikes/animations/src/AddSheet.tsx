import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path } from 'react-native-svg';
import type { BlurTarget } from './GlassTabBar';
import { Press } from './Press';
import { color, font, springs } from './theme';

type Kind = 'expense' | 'income';

// "left" values come from docs/sample-data.md budgets, in tetri.
const EXPENSE = [
  { id: 'coffee', label: 'Coffee', fg: '#946649', bg: '#F3E6DA', sel: '#EBD5C1', left: 7140, emoji: '☕' },
  { id: 'groceries', label: 'Groceries', fg: '#A0761C', bg: '#FFF0C7', sel: '#FFE39A', left: 8760, emoji: '🧺' },
  { id: 'transport', label: 'Getting around', fg: '#4A7EAD', bg: '#DCEBF8', sel: '#C7DDF3', left: 11400, emoji: '🚲' },
  { id: 'treats', label: 'Treats', fg: '#B9566E', bg: '#FBDDE3', sel: '#F6C8D3', left: 9670, emoji: '🍰' },
  { id: 'bills', label: 'Bills', fg: '#4E8A6A', bg: '#DDEEE3', sel: '#C8E4D2', left: 0, emoji: '💡' },
  { id: 'home', label: 'Home', fg: '#7A62A8', bg: '#ECE6F7', sel: '#DDD3F1', left: 0, emoji: '🏡' },
];
const INCOME = [
  { id: 'salary', label: 'Salary', fg: '#4E8A6A', bg: '#DDEEE3', sel: '#C8E4D2', left: 0, emoji: '' },
  { id: 'freelance', label: 'Freelance', fg: '#4A7EAD', bg: '#DCEBF8', sel: '#C7DDF3', left: 0, emoji: '' },
  { id: 'gift', label: 'Gift', fg: '#B9566E', bg: '#FBDDE3', sel: '#F6C8D3', left: 0, emoji: '' },
  { id: 'refund', label: 'Refund', fg: '#A0761C', bg: '#FFF0C7', sel: '#FFE39A', left: 0, emoji: '' },
];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

// Keypad text to tetri without floats (ADR 0003).
function toMinor(text: string) {
  const [whole, frac = ''] = text.split('.');
  return Number(whole || '0') * 100 + Number((frac + '00').slice(0, 2));
}

function fmt(minor: number) {
  return (minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

  const y = useSharedValue(sheetH);
  const scrim = useSharedValue(0);
  const thumb = useSharedValue(0);
  const caret = useSharedValue(1);

  useEffect(() => {
    y.value = withSpring(0, springs.sheet);
    scrim.value = withTiming(1, { duration: 350 });
    if (!reduceMotion) {
      caret.value = withRepeat(
        withSequence(withDelay(550, withTiming(0, { duration: 0 })), withDelay(550, withTiming(1, { duration: 0 }))),
        -1,
      );
    }
  }, [caret, reduceMotion, scrim, y]);

  const close = () => {
    scrim.value = withTiming(0, { duration: 250 });
    y.value = withTiming(sheetH, { duration: 280 }, (done) => {
      if (done) scheduleOnRN(onClosed);
    });
  };

  // Drag the sheet down to dismiss; small drags spring back.
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
        scrim.value = withTiming(0, { duration: 200 });
        y.value = withTiming(sheetH, { duration: 220 }, (done) => {
          if (done) scheduleOnRN(onClosed);
        });
      } else {
        y.value = withSpring(0, springs.sheet);
        scrim.value = withTiming(1, { duration: 200 });
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumb.value }] }));
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  const [segW, setSegW] = useState(0);
  const pickKind = (k: Kind) => {
    setKind(k);
    setCat(k === 'expense' ? EXPENSE[0].id : INCOME[0].id);
    thumb.value = withSpring(k === 'expense' ? 0 : segW, springs.thumb);
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
      message = `Nice! Still ₾${fmt(current.left - value)} left for ${current.label.toLowerCase()} ${current.emoji}`;
    } else {
      message = `₾${fmt(value - current.left)} over on ${current.label.toLowerCase()}, that's okay 🤍`;
      calm = true;
    }
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <BlurView
          intensity={12}
          tint="default"
          blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus"
          style={StyleSheet.absoluteFill}
        />
        <Press accessibilityLabel="Close" onPress={close} style={[StyleSheet.absoluteFill, styles.scrimTint]} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View accessibilityViewIsModal style={[styles.sheet, { height: sheetH }, sheetStyle]}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Press accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.close}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke={color.muted} strokeWidth={2.4} strokeLinecap="round" />
              </Svg>
            </Press>
            <Text style={styles.title}>{kind === 'expense' ? 'New expense' : 'New income'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View
            accessibilityRole="radiogroup"
            style={styles.segment}
            onLayout={(e) => setSegW((e.nativeEvent.layout.width - 8) / 2)}
          >
            {segW > 0 && <Animated.View style={[styles.segThumb, { width: segW }, thumbStyle]} />}
            {(['expense', 'income'] as Kind[]).map((k) => (
              <Press
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: kind === k }}
                onPress={() => pickKind(k)}
                style={styles.segItem}
              >
                <Text style={[styles.segText, { color: kind === k ? color.ink : color.muted }]}>
                  {k === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </Press>
            ))}
          </View>

          <View accessible accessibilityLabel={`Amount ${amountText} lari`} style={styles.amountRow}>
            <Text style={styles.amountSymbol}>₾</Text>
            <Text style={styles.amount}>{amountText}</Text>
            <Animated.View style={[styles.caret, caretStyle]} />
          </View>

          <View style={styles.msgWrap}>
            <View style={[styles.msg, { backgroundColor: calm ? '#F5EEE6' : color.goodSoft }]}>
              <Text style={[styles.msgText, { color: calm ? color.muted : color.good }]}>{message}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chips}
          >
            {list.map((c) => {
              const on = c.id === current.id;
              return (
                <Press
                  key={c.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setCat(c.id)}
                  style={[styles.chip, { backgroundColor: on ? c.sel : 'rgba(43,37,34,0.05)' }]}
                >
                  <View style={[styles.chipDot, { backgroundColor: on ? 'rgba(255,255,255,0.75)' : c.bg }]}>
                    <View style={[styles.chipDotInner, { backgroundColor: c.fg }]} />
                  </View>
                  <Text style={styles.chipText}>{c.label}</Text>
                </Press>
              );
            })}
          </ScrollView>

          <View style={styles.keys}>
            {KEYS.map((k) => (
              <Press
                key={k}
                haptic
                accessibilityRole="button"
                accessibilityLabel={k === 'back' ? 'Delete' : k === '.' ? 'Decimal point' : k}
                onPress={() => setAmount((a) => pressKey(a, k))}
                style={styles.key}
              >
                {k === 'back' ? (
                  <Svg width={26} height={26} viewBox="0 0 24 24">
                    <Path d="M9 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5.5-6z" fill={color.ink} fillOpacity={0.1} stroke={color.ink} strokeWidth={1.8} strokeLinejoin="round" />
                    <Path d="m12 10 4 4M16 10l-4 4" stroke={color.ink} strokeWidth={1.8} strokeLinecap="round" />
                  </Svg>
                ) : (
                  <Text style={styles.keyText}>{k}</Text>
                )}
              </Press>
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
  scrimTint: { backgroundColor: 'rgba(43,37,34,0.22)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 34,
    backgroundColor: 'rgba(255,252,248,0.97)',
    shadowColor: '#C8916A',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -12 },
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: '#E2D8CF' },
  header: { marginTop: 10, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(43,37,34,0.05)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: font.bold, color: color.ink },
  segment: { marginTop: 14, height: 44, padding: 4, borderRadius: 999, backgroundColor: color.track, flexDirection: 'row' },
  segThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999, backgroundColor: '#FFFFFF' },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 15, fontFamily: font.bold },
  amountRow: { marginTop: 22, height: 64, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  amountSymbol: { fontSize: 30, fontFamily: font.semibold, color: color.subtle, marginRight: 4, marginBottom: 9 },
  amount: { fontSize: 56, lineHeight: 64, fontFamily: font.bold, color: color.ink, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  caret: { width: 3, height: 46, marginLeft: 4, marginBottom: 8, borderRadius: 999, backgroundColor: color.ink },
  msgWrap: { marginTop: 10, alignItems: 'center' },
  msg: { height: 30, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  msgText: { fontSize: 13, fontFamily: font.bold },
  chipsScroll: { marginTop: 20, marginHorizontal: -24, flexGrow: 0 },
  chips: { paddingHorizontal: 24, gap: 8 },
  chip: { height: 44, paddingLeft: 12, paddingRight: 16, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chipDotInner: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 15, fontFamily: font.bold, color: color.ink },
  keys: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: {
    width: '31.6%',
    flexGrow: 1,
    height: 54,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8916A',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  keyText: { fontSize: 24, fontFamily: font.bold, color: color.ink, fontVariant: ['tabular-nums'] },
  cta: { marginTop: 16, height: 56, borderRadius: 999, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 17, fontFamily: font.bold, color: '#FFF8F1' },
});
