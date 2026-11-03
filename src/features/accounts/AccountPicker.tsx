import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { AccountIcon, CloseIcon, PlusIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { type CurrencyCode, formatMoney } from '@/domain/money';
import { useMoneyText } from '@/features/privacy/amounts';
import { color, fontFamily, radius, size, text } from '@/theme';
import type { AccountView } from './accounts';

type Props = {
  title: string;
  accounts: AccountView[];
  value: string;
  currency: CurrencyCode;
  onPick: (id: string) => void;
  onDismissed: () => void;
};

// AccountPicker (#21): every account with what it holds; picking one closes
// the sheet. "Add account" opens NewAccount on top.
export function AccountPicker({ title, accounts, value, currency, onPick, onDismissed }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const money = useMoneyText();
  return (
    <Sheet accessibilityLabel={title} onDismissed={onDismissed}>
      {(close) => (
        <>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
              <CloseIcon color={color.muted} />
            </Press>
          </View>
          <View accessibilityRole="radiogroup" style={styles.rows}>
            {accounts.map((a) => {
              const on = a.id === value;
              const amount = money(formatMoney(a.balanceMinor, currency));
              return (
                <Press
                  key={a.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${a.label}, ${amount}`}
                  onPress={() => {
                    onPick(a.id);
                    close();
                  }}
                  style={[styles.row, on ? styles.rowOn : styles.rowOff]}
                >
                  <View style={[styles.tile, { backgroundColor: a.tint.bg }]}>
                    <AccountIcon kind={a.kind} color={a.tint.fg} />
                  </View>
                  <View style={styles.rowText}>
                    <Text numberOfLines={1} style={styles.name}>
                      {a.label}
                    </Text>
                    <Text numberOfLines={1} style={styles.sub}>
                      {amount}
                    </Text>
                  </View>
                  <View style={[styles.dot, on ? styles.dotOn : styles.dotOff]}>
                    {on ? (
                      <Svg width={13} height={13} viewBox="0 0 24 24" accessible={false}>
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
                </Press>
              );
            })}
          </View>
          <Press
            accessibilityRole="button"
            onPress={() => router.push('/account')}
            style={styles.add}
          >
            <PlusIcon size={16} width={2.6} color={color.ink} />
            <Text style={styles.addText}>{t('accounts.add')}</Text>
          </Press>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 10,
    height: size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: fontFamily.extrabold, fontSize: 20, color: color.ink },
  close: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rows: { marginTop: 8, gap: 6 },
  row: {
    height: 66,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 20,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowOn: { backgroundColor: color.white, boxShadow: `inset 0px 0px 0px 2px ${color.ink}` },
  rowOff: { backgroundColor: color.washSoft },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: fontFamily.extrabold, fontSize: 16, lineHeight: 21, color: color.ink },
  sub: {
    ...text.meta,
    fontFamily: fontFamily.semibold,
    lineHeight: 17,
    fontVariant: ['tabular-nums'],
    color: color.muted,
  },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: color.ink },
  dotOff: { borderWidth: 2, borderColor: color.radioRingSoft },
  add: {
    marginTop: 10,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addText: { ...text.rowTitle, fontSize: 15, color: color.ink },
});
