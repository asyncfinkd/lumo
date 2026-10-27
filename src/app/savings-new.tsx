import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { CloseIcon, MinusIcon, PlusIcon } from '@/components/Icons';
import { Jar } from '@/components/Jar';
import { Press } from '@/components/Press';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import { db } from '@/db/client';
import { currencies, formatMoney, parseAmount } from '@/domain/money';
import { useProfile, useToday } from '@/features/live';
import { usePickedJar } from '@/features/savings/dropStore';
import { createJar } from '@/features/savings/repo';
import { type Cadence, fullBy, JAR_TONES, type JarTone } from '@/features/savings/savings';
import { color, fontFamily, jarColor, radius, shadow, size, text } from '@/theme';

/** "Each month" moves in ₾50 steps (SavingsNew), "Each day" in ₾1, from ₾250 and ₾5. */
const PLAN = {
  month: { step: 5000, start: 25000 },
  day: { step: 100, start: 500 },
} as const;
const TONE_NAMES = {
  gold: 'savings.new.tones.gold',
  sky: 'savings.new.tones.sky',
  blush: 'savings.new.tones.blush',
  sage: 'savings.new.tones.sage',
} as const satisfies Record<JarTone, string>;

// "New jar" (SavingsNew): what it's for, its color, the goal and how much
// goes in each month, with when it will be full.
export default function SavingsNewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const today = useToday();
  const profile = useProfile();
  const pick = usePickedJar((s) => s.pick);
  const [name, setName] = useState('');
  const [tone, setTone] = useState<JarTone>('gold');
  const [goalText, setGoalText] = useState('');
  const [cadence, setCadence] = useState<Cadence>('month');
  const [planMinor, setPlanMinor] = useState<number>(PLAN.month.start);
  const step = PLAN[cadence].step;

  const currency = profile?.currency ?? 'GEL';
  const money = (minor: number) => formatMoney(minor, currency, { decimals: 'auto' });
  const goalMinor = parseAmount(goalText.replace(/\s/g, ''), currency) ?? 0;
  const plan = goalMinor > 0 ? Math.min(planMinor, goalMinor) : planMinor;
  const ready = name.trim().length > 0 && goalMinor > 0;
  const full = goalMinor > 0 ? fullBy(today, goalMinor, { planMinor: plan, cadence }) : null;

  const create = (close: () => void) => {
    if (!ready) return;
    const id = createJar(db, { name, tone, goalMinor, planMinor: plan, cadence }, today);
    pick(id);
    close();
  };

  return (
    <Sheet accessibilityLabel={t('savings.newJar')} top={112} onDismissed={router.back}>
      {(close) => (
        <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.body}>
          <View style={styles.bar}>
            <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
              <CloseIcon color={color.muted} />
            </Press>
            <Text accessibilityRole="header" style={styles.title}>
              {t('savings.newJar')}
            </Text>
            <View style={styles.side} />
          </View>

          <View style={styles.jar}>
            <Jar pct={0} size={96} tone={tone} label={false} />
          </View>

          <View style={styles.nameField}>
            <TextInput
              accessibilityLabel={t('savings.new.namePlaceholder')}
              placeholder={t('savings.new.namePlaceholder')}
              placeholderTextColor={color.lockIconOff}
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoCapitalize="sentences"
              returnKeyType="done"
              style={styles.nameInput}
            />
          </View>

          <View accessibilityRole="radiogroup" style={styles.tones}>
            {JAR_TONES.map((key) => {
              const on = key === tone;
              return (
                <Press
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={t(TONE_NAMES[key])}
                  onPress={() => setTone(key)}
                  style={[
                    styles.tone,
                    { backgroundColor: jarColor.tone[key].swatch },
                    on ? styles.toneOn : styles.toneOff,
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.cadence}>
            <SegmentedControl
              accessibilityLabel={t('savings.new.cadence')}
              options={[
                { value: 'day', label: t('savings.new.day') },
                { value: 'month', label: t('savings.new.month') },
              ]}
              value={cadence}
              onChange={(next) => {
                setCadence(next);
                setPlanMinor(PLAN[next].start);
              }}
            />
          </View>

          <View style={styles.plan}>
            <View style={[styles.planRow, styles.planDivider]}>
              <Text style={styles.planLabel}>{t('savings.new.goal')}</Text>
              <Text style={styles.planSymbol}>{currencies[currency].symbol}</Text>
              {/* A hidden copy of the text sizes the field, so it grows as you type. */}
              <View>
                <Text accessible={false} style={[styles.goalInput, styles.sizer]}>
                  {goalText || '0'}
                </Text>
                <TextInput
                  accessibilityLabel={t('savings.new.goal')}
                  placeholder="0"
                  placeholderTextColor={color.placeholder}
                  value={goalText}
                  onChangeText={(next) => setGoalText(next.replace(/[^\d.,]/g, '').slice(0, 9))}
                  keyboardType="decimal-pad"
                  style={[styles.goalInput, StyleSheet.absoluteFill]}
                />
              </View>
            </View>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>
                {t(cadence === 'day' ? 'savings.new.daily' : 'savings.new.monthly')}
              </Text>
              <Press
                accessibilityLabel={t(`savings.new.less.${cadence}`, { amount: money(step) })}
                onPress={() => setPlanMinor((v) => Math.max(step, v - step))}
                style={styles.step}
              >
                <MinusIcon color={color.ink} size={14} />
              </Press>
              <Text accessibilityLiveRegion="polite" style={styles.monthly}>
                {money(plan)}
              </Text>
              <Press
                accessibilityLabel={t(`savings.new.more.${cadence}`, { amount: money(step) })}
                onPress={() =>
                  setPlanMinor((v) => Math.min(goalMinor > 0 ? goalMinor : v + step, v + step))
                }
                style={styles.step}
              >
                <PlusIcon color={color.ink} size={14} width={2.8} />
              </Press>
            </View>
          </View>

          {full ? (
            <View accessibilityLiveRegion="polite" style={styles.eta}>
              <Text style={styles.etaText}>
                {t('savings.new.fullBy', {
                  month: new Date(full.year, full.month - 1, 1).toLocaleDateString(i18n.language, {
                    month: 'long',
                    year: 'numeric',
                  }),
                })}
              </Text>
            </View>
          ) : null}

          <Button
            label={t('savings.new.create')}
            disabled={!ready}
            onPress={() => create(close)}
            style={styles.create}
          />
        </Pressable>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  bar: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  close: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...text.section, flex: 1, textAlign: 'center', color: color.ink },
  side: { width: size.touch },
  jar: { marginTop: 8, alignItems: 'center' },
  nameField: {
    marginTop: 12,
    height: 60,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
    justifyContent: 'center',
  },
  nameInput: {
    padding: 0,
    textAlign: 'center',
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    color: color.ink,
  },
  tones: { marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 12 },
  tone: { width: 40, height: 40, borderRadius: 20 },
  toneOn: { boxShadow: shadow.toneOn },
  toneOff: { boxShadow: shadow.toneRing },
  cadence: { marginTop: 18 },
  plan: {
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
  },
  planRow: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 10 },
  planDivider: { borderBottomWidth: 1, borderBottomColor: color.washStrong, gap: 2 },
  planLabel: { ...text.label, flex: 1, color: color.muted },
  planSymbol: { fontFamily: fontFamily.extrabold, fontSize: 18, color: color.ink },
  goalInput: {
    padding: 0,
    fontFamily: fontFamily.extrabold,
    fontSize: 18,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  sizer: { opacity: 0 },
  step: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthly: {
    minWidth: 58,
    textAlign: 'center',
    fontFamily: fontFamily.extrabold,
    fontSize: 18,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  eta: {
    marginTop: 14,
    alignSelf: 'center',
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.goodSoft,
    justifyContent: 'center',
  },
  etaText: { fontFamily: fontFamily.extrabold, fontSize: 14, color: color.good },
  create: { marginTop: 'auto' },
});
