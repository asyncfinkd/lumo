import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { AccountIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { db } from '@/db/client';
import { accountBalances } from '@/domain/balance';
import { formatMoney } from '@/domain/money';
import { useAccountViews } from '@/features/accounts/accounts';
import { accountUsage, deleteAccount } from '@/features/accounts/repo';
import { useAllTransactions, useProfile } from '@/features/live';
import { color, fontFamily, radius, text } from '@/theme';

type How = 'move' | 'delete';

const pickedStyle = {
  backgroundColor: color.white,
  boxShadow: `inset 0px 0px 0px 2px ${color.ink}`,
};

function Tick({ on }: { on: boolean }) {
  return (
    <View style={[styles.dot, on ? styles.dotOn : styles.dotOff]}>
      {on ? (
        <Svg width={12} height={12} viewBox="0 0 24 24" accessible={false}>
          <Path
            d="m5.5 12.5 4 4 9-9"
            stroke={color.white}
            strokeWidth={3.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </View>
  );
}

// AccountDelete (#21): its transactions move to another account, keeping the
// total, or go with it. The last account stays: Lumo needs one.
export default function AccountDeleteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const accounts = useAccountViews();
  const transactions = useAllTransactions();
  const currency = profile?.currency ?? 'GEL';
  const account = accounts.find((a) => a.id === id);
  const others = accounts.filter((a) => a.id !== id);

  const [usage] = useState(() => accountUsage(db, id));
  const [how, setHow] = useState<How>('move');
  const [picked, setMoveTo] = useState<string>();
  // The live list can arrive after the first render; until one is picked, the first other.
  const moveTo = picked ?? others[0]?.id;

  const total = accounts.reduce((sum, a) => sum + a.balanceMinor, 0);
  // Deleting its transactions takes their money off the total; its moves and
  // jar money never changed the total.
  const ownMinor = useMemo(
    () =>
      accountBalances(
        [id],
        transactions.filter((tx) => tx.accountId === id),
      ).get(id) ?? 0,
    [id, transactions],
  );

  if (!account) return null;
  const tile = (
    <View style={[styles.icon, { backgroundColor: account.tint.bg }]}>
      <AccountIcon kind={account.kind} size={26} color={account.tint.fg} />
    </View>
  );

  if (others.length === 0) {
    return (
      <Dialog accessibilityLabel={t('accounts.lastTitle', { name: account.label })}>
        {tile}
        <Text accessibilityRole="header" style={styles.title}>
          {t('accounts.lastTitle', { name: account.label })}
        </Text>
        <Text style={styles.body}>{t('accounts.lastBody')}</Text>
        <View style={styles.actions}>
          <Button
            label={t('accounts.addAnother')}
            onPress={() => {
              router.dismissTo('/accounts');
              router.push('/account');
            }}
          />
          <Button variant="quiet" label={t('accounts.okay')} onPress={() => router.back()} />
        </View>
      </Dialog>
    );
  }

  const options: { key: How; title: string; sub: string }[] = [
    {
      key: 'move',
      title: t('accounts.moveOption'),
      sub: t('accounts.moveSub', {
        amount: formatMoney(account.balanceMinor, currency),
        total: formatMoney(total, currency),
      }),
    },
    {
      key: 'delete',
      title: t('accounts.deleteOption'),
      sub: t('accounts.deleteSub', { total: formatMoney(total - ownMinor, currency) }),
    },
  ];

  const confirm = () => {
    if (how === 'move' && !moveTo) return;
    deleteAccount(db, id, how === 'move' ? { moveTo: moveTo! } : 'delete');
    // Back past the edit sheet to the list.
    router.dismissTo('/accounts');
  };

  return (
    <Dialog accessibilityLabel={t('accounts.deleteTitle', { name: account.label })}>
      {tile}
      <Text accessibilityRole="header" style={styles.title}>
        {t('accounts.deleteTitle', { name: account.label })}
      </Text>
      <Text style={styles.body}>{t('accounts.deleteBody', { count: usage })}</Text>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((o) => {
          const on = o.key === how;
          return (
            <Press
              key={o.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${o.title}. ${o.sub}`}
              onPress={() => setHow(o.key)}
              style={[styles.option, on ? pickedStyle : styles.idle]}
            >
              <Tick on={on} />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </View>
            </Press>
          );
        })}
      </View>

      {how === 'move' ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('accounts.moveTo')}
          style={styles.targets}
        >
          {others.map((a) => {
            const on = a.id === moveTo;
            return (
              <Press
                key={a.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={a.label}
                onPress={() => setMoveTo(a.id)}
                style={[styles.target, on ? pickedStyle : styles.idle]}
              >
                <View style={[styles.targetDot, { backgroundColor: a.tint.chart }]} />
                <Text numberOfLines={1} style={styles.targetName}>
                  {a.label}
                </Text>
              </Press>
            );
          })}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Press accessibilityRole="button" haptic onPress={confirm} style={styles.delete}>
          <Text style={styles.deleteText}>
            {how === 'move' ? t('accounts.moveAndDelete') : t('accounts.deleteEverything')}
          </Text>
        </Press>
        <Button variant="quiet" label={t('accounts.keep')} onPress={() => router.back()} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 14,
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    textAlign: 'center',
    color: color.ink,
  },
  body: { ...text.subtitle, lineHeight: 20, marginTop: 6, textAlign: 'center', color: color.muted },
  options: { marginTop: 14, alignSelf: 'stretch', gap: 8 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  idle: { backgroundColor: color.washSoft },
  optionText: { flex: 1, minWidth: 0, gap: 3 },
  optionTitle: { fontFamily: fontFamily.extrabold, fontSize: 15, lineHeight: 20, color: color.ink },
  optionSub: {
    ...text.meta,
    fontFamily: fontFamily.semibold,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
    color: color.muted,
  },
  dot: {
    marginTop: 1,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: color.ink },
  dotOff: { borderWidth: 2, borderColor: color.radioRingSoft },
  targets: { marginTop: 10, alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  target: {
    flexGrow: 1,
    flexBasis: '40%',
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  targetDot: { width: 10, height: 10, borderRadius: 5 },
  targetName: { ...text.label, flexShrink: 1, fontFamily: fontFamily.bold, color: color.ink },
  actions: { marginTop: 16, alignSelf: 'stretch', gap: 6 },
  delete: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.dangerStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { ...text.rowTitle, color: color.white },
});
