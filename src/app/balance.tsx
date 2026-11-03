import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AmountDisplay, groupTyped } from '@/components/AmountDisplay';
import { Button } from '@/components/Button';
import { AccountIcon } from '@/components/Icons';
import { Numpad, typedAmount } from '@/components/Numpad';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { db } from '@/db/client';
import { defaultAccountId } from '@/db/defaultAccount';
import { currencies, formatMoney, parseAmount } from '@/domain/money';
import { accountLabel, useAccountViews } from '@/features/accounts/accounts';
import { accountById, accountsQuery } from '@/features/accounts/repo';
import { useToday } from '@/features/live';
import { adjustBalance, currentAccountBalance, getProfile } from '@/features/profile/repo';
import { color, fontFamily, radius, text } from '@/theme';

// "Add your balance" / changing it from Home (#6): the user types what they
// really have and Kept stores the difference as an adjustment. With two or
// more accounts it's one account at a time (Balance, #21); `account` picks
// which one it opens on.
export default function BalanceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const today = useToday();
  const params = useLocalSearchParams<{ account?: string }>();
  const views = useAccountViews();
  // Read once on open: the sheet starts from the balance as it is now.
  const [currency] = useState(() => getProfile(db)?.currency ?? 'GEL');
  const [multi] = useState(() => accountsQuery(db).all().length > 1);
  const [accountId, setAccountId] = useState(() => params.account ?? defaultAccountId(db));
  const startFor = (id: string) => {
    const current = currentAccountBalance(db, id);
    return current !== null && current > 0 ? typedAmount(current, currency) : '0';
  };
  const [typed, setTyped] = useState(() => startFor(accountId));
  // Below zero opens as 0 (the numpad can't type a minus), so until the user
  // types, there's nothing to change.
  const [edited, setEdited] = useState(false);

  const account = views.find((a) => a.id === accountId);
  // The live list arrives a render later; until then, read the account itself.
  const row = account ? undefined : accountById(db, accountId);
  const name = account?.label ?? (row ? accountLabel(row, t('accounts.main')) : '');
  const shownMinor = account?.balanceMinor ?? currentAccountBalance(db, accountId) ?? 0;
  const typedMinor = parseAmount(typed, currency) ?? 0;
  const diff = edited || shownMinor >= 0 ? typedMinor - shownMinor : 0;

  const type = (next: string) => {
    setTyped(next);
    setEdited(true);
  };

  const pick = (id: string) => {
    setAccountId(id);
    setTyped(startFor(id));
    setEdited(false);
  };

  const save = (close: () => void) => {
    const minor = parseAmount(typed, currency);
    if (minor === null) return;
    // One account at a time, Save does just what the card says.
    if (!multi || diff !== 0) adjustBalance(db, minor, today, accountId);
    close();
  };

  const amountLabel = t('balance.amountLabel', {
    amount: `${currencies[currency].symbol}${groupTyped(typed)}`,
  });

  if (!multi) {
    return (
      <Sheet accessibilityLabel={t('balance.title')} onDismissed={router.back}>
        {(close) => (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {t('balance.title')}
            </Text>
            <Text style={styles.hint}>{t('balance.hint')}</Text>
            <View style={styles.amount}>
              <AmountDisplay typed={typed} currency={currency} accessibilityLabel={amountLabel} />
            </View>
            <Numpad value={typed} onChange={setTyped} currency={currency} />
            <Button label={t('common.save')} onPress={() => save(close)} style={styles.save} />
          </>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet top={72} accessibilityLabel={t('balance.change')} onDismissed={router.back}>
      {(close) => (
        <>
          <Text accessibilityRole="header" style={styles.change}>
            {t('balance.change')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('accounts.which')}
            style={styles.chips}
            contentContainerStyle={styles.chipsContent}
          >
            {views.map((a) => {
              const on = a.id === accountId;
              return (
                <Press
                  key={a.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={a.label}
                  onPress={() => pick(a.id)}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                >
                  <View style={[styles.chipTile, { backgroundColor: a.tint.bg }]}>
                    <AccountIcon kind={a.kind} size={17} width={2} color={a.tint.fg} />
                  </View>
                  <Text style={styles.chipText}>{a.label}</Text>
                </Press>
              );
            })}
          </ScrollView>

          <Text style={styles.question}>{t('balance.whatsIn', { name })}</Text>
          <View style={styles.amountTight}>
            <AmountDisplay typed={typed} currency={currency} accessibilityLabel={amountLabel} />
          </View>

          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t('balance.shows', { name })}</Text>
              <Text style={styles.cardValue}>{formatMoney(shownMinor, currency)}</Text>
            </View>
            <View style={[styles.cardRow, styles.cardLine]}>
              <Text style={styles.cardLabel}>{t('balance.adjustment')}</Text>
              <Text style={[styles.cardValue, styles.cardDiff]}>
                {diff === 0
                  ? t('balance.noneNeeded')
                  : `${diff > 0 ? '+' : '−'}${formatMoney(Math.abs(diff), currency)}`}
              </Text>
            </View>
          </View>
          <Text style={styles.explain}>
            {diff === 0 ? t('balance.matches') : t('balance.explainIn', { name })}
          </Text>

          <View style={styles.keys}>
            <Numpad value={typed} onChange={type} currency={currency} keyHeight={46} />
          </View>
          <Button label={t('common.save')} onPress={() => save(close)} style={styles.save} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { ...text.section, color: color.ink, marginTop: 18, textAlign: 'center' },
  hint: { ...text.subtitle, color: color.muted, marginTop: 4, textAlign: 'center' },
  amount: { marginTop: 20, marginBottom: 20 },
  save: { marginTop: 16 },
  change: { ...text.section, color: color.ink, marginTop: 18, textAlign: 'center' },
  chips: { marginTop: 14, marginHorizontal: -24, flexGrow: 0 },
  chipsContent: { paddingHorizontal: 24, gap: 8 },
  chip: {
    height: 44,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipOn: { backgroundColor: color.white, boxShadow: `inset 0px 0px 0px 2px ${color.ink}` },
  chipOff: { backgroundColor: color.wash },
  chipTile: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: fontFamily.bold, fontSize: 15, color: color.ink },
  question: {
    marginTop: 18,
    fontFamily: fontFamily.extrabold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: color.ink,
  },
  amountTight: { marginTop: 14 },
  card: {
    marginTop: 14,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.card,
  },
  cardRow: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardLine: { borderTopWidth: 1, borderTopColor: 'rgba(43,37,34,0.06)' },
  cardLabel: { ...text.subtitle, flex: 1, fontSize: 14, color: color.muted },
  cardValue: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    color: color.ink,
  },
  cardDiff: { fontFamily: fontFamily.extrabold, color: color.softInk },
  explain: {
    ...text.meta,
    marginTop: 10,
    marginHorizontal: 4,
    fontFamily: fontFamily.semibold,
    lineHeight: 18,
    color: color.muted,
  },
  keys: { marginTop: 14 },
});
