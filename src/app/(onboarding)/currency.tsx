import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Path } from 'react-native-svg';
import { Press } from '@/components/Press';
import { type CurrencyCode, currencies } from '@/domain/money';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { useOnboarding } from '@/features/onboarding/store';
import { color, currencyColor, radius, shadow, text } from '@/theme';

const CODES = Object.keys(currencies) as CurrencyCode[];

// OBCurrency: step 2 of 4. Lari is picked already; search by name, code or symbol.
export default function CurrencyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const currency = useOnboarding((s) => s.currency);
  const setCurrency = useOnboarding((s) => s.setCurrency);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CODES;
    return CODES.filter(
      (code) =>
        t(`currencies.${code}`).toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        currencies[code].symbol === q,
    );
  }, [query, t]);

  return (
    <OnboardingStep
      step={2}
      onBack={router.back}
      title={t('onboarding.currency.title')}
      hint={t('onboarding.currency.hint')}
      primary={{
        label: t('onboarding.currency.continueWith', {
          currency: `${currencies[currency].symbol} ${currency}`,
        }),
        onPress: () => router.push('/income'),
      }}
    >
      <View style={styles.search}>
        <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
          <Circle
            cx={11}
            cy={11}
            r={6.5}
            fill={color.muted}
            fillOpacity={0.15}
            stroke={color.muted}
            strokeWidth={2}
          />
          <Path d="m16 16 4.5 4.5" stroke={color.muted} strokeWidth={2} strokeLinecap="round" />
        </Svg>
        <TextInput
          accessibilityLabel={t('onboarding.currency.search')}
          placeholder={t('onboarding.currency.search')}
          placeholderTextColor={color.placeholder}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('onboarding.currency.label')}
        style={styles.list}
      >
        {/* Eight rows: a plain nested ScrollView (a FlatList can't nest in the step's ScrollView). */}
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        >
          {rows.length === 0 ? (
            <Text style={styles.empty}>{t('onboarding.currency.empty')}</Text>
          ) : null}
          {rows.map((code) => {
            const selected = code === currency;
            const tile = currencyColor[code];
            return (
              <Press
                key={code}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${t(`currencies.${code}`)}, ${code}`}
                onPress={() => setCurrency(code)}
                style={[styles.row, selected && { backgroundColor: color.selectedRow }]}
              >
                <View style={[styles.tile, { backgroundColor: tile.bg }]}>
                  <Text style={[styles.symbol, { color: tile.fg }]}>{currencies[code].symbol}</Text>
                </View>
                <View style={styles.names}>
                  <Text style={styles.name}>{t(`currencies.${code}`)}</Text>
                  <Text style={styles.code}>{code}</Text>
                </View>
                <View style={[styles.dot, selected ? styles.dotOn : styles.dotOff]}>
                  {selected ? (
                    <Svg width={14} height={14} viewBox="0 0 24 24" accessible={false}>
                      <Path
                        d="m6 12.5 4 4 8-9"
                        stroke={color.white}
                        strokeWidth={3.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </Svg>
                  ) : null}
                </View>
              </Press>
            );
          })}
        </ScrollView>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  search: {
    marginTop: 20,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: color.field,
    boxShadow: shadow.search,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...text.rowTitle,
    lineHeight: undefined,
    color: color.ink,
  },
  list: {
    marginTop: 12,
    height: 386,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.listCard,
    boxShadow: shadow.list,
    overflow: 'hidden',
  },
  listContent: { padding: 4, paddingHorizontal: 6, gap: 2 },
  row: {
    height: 60,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 22,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.tileSmall,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { ...text.h1, fontSize: 21, lineHeight: 26 },
  names: { flex: 1, minWidth: 0, gap: 1 },
  name: { ...text.rowTitle, color: color.ink },
  code: { ...text.meta, color: color.muted },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: color.ink },
  dotOff: { boxShadow: `inset 0px 0px 0px 2px ${color.radioRing}` },
  empty: {
    ...text.label,
    fontFamily: text.subtitle.fontFamily,
    color: color.muted,
    textAlign: 'center',
    padding: 40,
  },
});
