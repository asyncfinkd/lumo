import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useScreenTop } from '@/components/useScreenTop';
import { PlusIcon } from '@/components/Icons';
import { Jar } from '@/components/Jar';
import { Rise } from '@/components/motion';
import { Press } from '@/components/Press';
import type { Jar as JarRow } from '@/db/schema';
import { formatMoney } from '@/domain/money';
import { useJarEntries, useJars, useToday } from '@/features/live';
import { HeaderButton } from '@/features/profile/SettingsHeader';
import { useJarDrop } from '@/features/savings/dropStore';
import { JarToast } from '@/features/savings/JarToast';
import { jarPace, jarPercent, savedByJar } from '@/features/savings/savings';
import { useMonthName } from '@/features/savings/useMonthName';
import {
  color,
  fontFamily,
  gradient,
  radius,
  savingsColor,
  shadow,
  size,
  space,
  text,
} from '@/theme';

// Savings (Savings, SavingsAdded): one jar up front with its pace, Add to jar,
// and the other jars below. Tapping another jar brings it to the front.
export default function SavingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const screenTop = useScreenTop();
  const today = useToday();
  const jars = useJars();
  const entries = useJarEntries();
  const drop = useJarDrop((s) => s.drop);
  const monthName = useMonthName(today);
  const [picked, setPicked] = useState<string | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  // Three tiles to a row, 10pt apart.
  const tileWidth = gridWidth ? (gridWidth - TILE_GAP * 2) / 3 : undefined;

  const saved = useMemo(() => savedByJar(entries), [entries]);
  // The add sheet opens on this jar, so a drop always lands on the one in front.
  const featured = jars.find((j) => j.id === picked) ?? jars[0];

  // A drop is played once; leaving the tab and coming back doesn't replay it.
  const clear = useJarDrop((s) => s.clear);
  useEffect(() => {
    if (!drop) return;
    const timer = setTimeout(clear, 6000);
    return () => clearTimeout(timer);
  }, [drop, clear]);

  const total = jars.reduce((sum, j) => sum + (saved.get(j.id) ?? 0), 0);
  const currency = featured?.currency ?? 'GEL';
  const money = (minor: number) => formatMoney(minor, currency, { decimals: 'auto' });

  return (
    <>
      <View pointerEvents="none" style={[styles.glow, { top: screenTop + 91 }]} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: screenTop }]}
        showsVerticalScrollIndicator={false}
      >
        <Rise style={styles.header}>
          <View style={styles.titles}>
            <Text accessibilityRole="header" style={styles.title}>
              {t('savings.title')}
            </Text>
            {jars.length > 0 ? (
              <Text style={styles.subtitle}>
                {t('savings.summary', { count: jars.length, amount: money(total) })}
              </Text>
            ) : null}
          </View>
          <HeaderButton label={t('savings.newJar')} onPress={() => router.push('/savings-new')}>
            <PlusIcon color={color.ink} size={20} width={2.2} />
          </HeaderButton>
        </Rise>

        {featured ? (
          <Featured
            jar={featured}
            savedMinor={saved.get(featured.id) ?? 0}
            drop={drop?.jarId === featured.id ? drop : null}
            money={money}
            paceText={(jar, savedMinor) => {
              const pace = jarPace(jar, savedMinor, today);
              if (pace.type === 'full') return null;
              if (pace.type === 'ahead') return t('savings.paceAhead');
              return t('savings.paceReady', {
                amount: money(jar.monthlyMinor),
                month: monthName(pace.year, pace.month),
              });
            }}
            onAdd={() => router.push({ pathname: '/savings-add', params: { jar: featured.id } })}
          />
        ) : null}

        {featured ? (
          <Rise delay={180} style={styles.others}>
            <Text accessibilityRole="header" style={styles.section}>
              {t('savings.otherJars')}
            </Text>
            <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
              {jars
                .filter((j) => j.id !== featured.id)
                .map((jar) => {
                  const pct = jarPercent(saved.get(jar.id) ?? 0, jar.goalMinor);
                  const amount = money(saved.get(jar.id) ?? 0);
                  return (
                    <Press
                      key={jar.id}
                      accessibilityRole="button"
                      accessibilityLabel={t('savings.tileLabel', {
                        name: jar.name,
                        amount,
                        percent: pct,
                      })}
                      onPress={() => setPicked(jar.id)}
                      style={[styles.tile, { width: tileWidth }]}
                    >
                      <Jar pct={pct} size={44} tone={jar.tone} label={false} />
                      <Text numberOfLines={1} style={styles.tileName}>
                        {jar.name}
                      </Text>
                      <Text style={styles.tileAmount}>
                        {t('savings.tile', { amount, percent: pct })}
                      </Text>
                    </Press>
                  );
                })}
              <Press
                accessibilityRole="button"
                accessibilityLabel={t('savings.newJar')}
                onPress={() => router.push('/savings-new')}
                style={[styles.tile, styles.newTile, { width: tileWidth }]}
              >
                <View style={styles.newIcon}>
                  <PlusIcon color={color.muted} size={18} />
                </View>
                <Text style={[styles.tileName, { color: color.muted }]}>{t('savings.newJar')}</Text>
              </Press>
            </View>
          </Rise>
        ) : null}
      </ScrollView>
      {drop && featured?.id === drop.jarId ? (
        <JarToast
          key={drop.key}
          amount={money(drop.amountMinor)}
          percent={drop.to}
          currency={currency}
        />
      ) : null}
    </>
  );
}

function Featured({
  jar,
  savedMinor,
  drop,
  money,
  paceText,
  onAdd,
}: {
  jar: JarRow;
  savedMinor: number;
  drop: { from: number; key: number } | null;
  money: (minor: number) => string;
  paceText: (jar: JarRow, savedMinor: number) => string | null;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const pct = jarPercent(savedMinor, jar.goalMinor);
  const pace = paceText(jar, savedMinor);

  return (
    <>
      <Rise delay={60} style={styles.featured}>
        <Jar
          pct={pct}
          from={drop?.from}
          drop={!!drop}
          dropKey={drop?.key}
          size={186}
          tone={jar.tone}
          accessibilityLabel={t('savings.jarLabel', { name: jar.name, percent: pct })}
        />
        <Text accessibilityRole="header" style={styles.name}>
          {jar.name}
        </Text>
        <Text style={styles.of}>
          <Text style={styles.ofSaved}>{money(savedMinor)}</Text>
          {t('savings.of', { goal: money(jar.goalMinor) })}
        </Text>
        {pace ? (
          <View style={styles.pace}>
            <Text style={styles.paceText}>{pace}</Text>
          </View>
        ) : null}
      </Rise>

      <Rise delay={120} style={styles.actions}>
        <Press haptic accessibilityRole="button" onPress={onAdd} style={styles.add}>
          <PlusIcon color={color.white} size={20} />
          <Text style={styles.addText}>{t('savings.add')}</Text>
        </Press>
        {/* "Take money out" waits for its sheet's design. */}
      </Rise>
    </>
  );
}

const TILE_GAP = 10;

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.screen, paddingBottom: space.screenBottom },
  glow: {
    position: 'absolute',
    left: '50%',
    width: 340,
    height: 340,
    marginLeft: -170,
    borderRadius: 170,
    backgroundImage: gradient.jarGlow,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titles: { gap: 2, flexShrink: 1 },
  title: { ...text.h1, color: color.ink },
  subtitle: { ...text.subtitle, color: color.muted, fontVariant: ['tabular-nums'] },
  featured: { marginTop: 14, alignItems: 'center' },
  name: {
    marginTop: 14,
    fontFamily: fontFamily.extrabold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    textAlign: 'center',
    color: color.ink,
  },
  of: {
    marginTop: 4,
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: color.muted,
    fontVariant: ['tabular-nums'],
  },
  ofSaved: { fontFamily: fontFamily.extrabold, color: color.ink },
  pace: {
    marginTop: 12,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: savingsColor.paceBg,
    justifyContent: 'center',
  },
  paceText: {
    fontFamily: fontFamily.extrabold,
    fontSize: 13,
    color: savingsColor.paceText,
    fontVariant: ['tabular-nums'],
  },
  actions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  add: {
    flex: 1,
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    boxShadow: shadow.cta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addText: { ...text.section, color: color.white },
  others: { marginTop: 22, gap: 10 },
  section: { ...text.section, color: color.ink, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: {
    height: 118,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.jarTile,
    alignItems: 'center',
    gap: 4,
  },
  tileName: {
    fontFamily: fontFamily.extrabold,
    fontSize: 13,
    lineHeight: 17,
    color: color.ink,
  },
  tileAmount: {
    ...text.small,
    lineHeight: 15,
    color: color.muted,
    fontVariant: ['tabular-nums'],
  },
  newTile: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: savingsColor.newTileBorder,
    justifyContent: 'center',
    gap: 6,
  },
  newIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
