import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, CloseIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { Switch } from '@/components/Switch';
import { db } from '@/db/client';
import type { RecurringBill } from '@/db/schema';
import { typedAmount } from '@/components/Numpad';
import { type CurrencyCode, currencies, parseAmount } from '@/domain/money';
import { useCategories } from '@/features/categories/categories';
import { useBills, useProfile } from '@/features/live';
import { cleanAmount } from '@/features/onboarding/bills';
import { deleteBill, saveBill, setBillActive, setBillRemind } from '@/features/recurring/repo';
import { color, fontFamily, radius, shadow, size, text } from '@/theme';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// ProfileBillEdit: a bill's name, amount, due day, category and whether Lumo
// adds it by itself. With no `id` it adds a new bill.
export default function ProfileBillScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const bills = useBills();
  const profile = useProfile();
  if (!profile) return null;
  if (!id) return <BillForm currency={profile.currency} payday={profile.payday} />;
  const bill = bills.find((b) => b.id === id);
  // Wait for the live query, so the form starts filled in.
  if (!bill) return null;
  return <BillForm bill={bill} currency={profile.currency} payday={profile.payday} />;
}

function BillForm({
  bill,
  currency,
  payday,
}: {
  bill?: RecurringBill;
  currency: CurrencyCode;
  payday: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const categories = useCategories().ofKind('expense');
  const [name, setName] = useState(bill?.name ?? '');
  const [typed, setTyped] = useState(bill ? typedAmount(bill.amountMinor, currency) : '');
  const [day, setDay] = useState(bill?.day ?? payday);
  const [categoryId, setCategoryId] = useState(bill?.categoryId ?? 'bills');
  const [auto, setAuto] = useState(bill?.active ?? true);
  const [remind, setRemind] = useState(bill?.remind ?? true);
  const [pickingDay, setPickingDay] = useState(false);

  const amountMinor = parseAmount(typed, currency);
  const ready = name.trim().length > 0 && amountMinor !== null && amountMinor > 0;
  const ordinal = (n: number) => t('onboarding.income.paydayValue', { count: n, ordinal: true });
  const title = bill ? t('billsManage.edit') : t('billsManage.new');

  const save = (close: () => void) => {
    if (!ready) return;
    const saved = saveBill(db, {
      id: bill?.id,
      name,
      amountMinor: amountMinor!,
      day,
      categoryId,
    });
    setBillActive(db, saved.id, auto);
    setBillRemind(db, saved.id, remind);
    close();
  };

  return (
    <>
      <Sheet accessibilityLabel={title} onDismissed={router.back}>
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

            <View style={styles.fields}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('billsManage.name')}</Text>
                <TextInput
                  accessibilityLabel={t('billsManage.name')}
                  value={name}
                  onChangeText={setName}
                  autoFocus={!bill}
                  maxLength={30}
                  returnKeyType="next"
                  style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t('billsManage.amount')}</Text>
                <Text style={styles.symbol}>{currencies[currency].symbol}</Text>
                <TextInput
                  accessibilityLabel={t('billsManage.amount')}
                  value={typed}
                  onChangeText={(next) => setTyped(cleanAmount(next))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={color.placeholder}
                  style={[styles.input, styles.amountInput]}
                />
              </View>
              <View style={[styles.field, styles.dueField]}>
                <Text style={[styles.label, styles.dueLabel]}>{t('billsManage.dueLabel')}</Text>
                <Press
                  accessibilityLabel={t('billsManage.dueButton', { day: ordinal(day) })}
                  onPress={() => setPickingDay(true)}
                  style={styles.dueButton}
                >
                  <Text style={styles.dueText}>{t('billsManage.due', { day: ordinal(day) })}</Text>
                  <ChevronDownIcon color={color.muted} />
                </Press>
              </View>
            </View>

            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t('billsManage.category')}
              style={styles.chips}
            >
              {categories.map((c) => {
                const on = c.id === categoryId;
                return (
                  <Press
                    key={c.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => c.id && setCategoryId(c.id)}
                    style={[styles.chip, { backgroundColor: on ? c.tint.selected : color.wash }]}
                  >
                    <Text style={[styles.chipText, { color: on ? c.tint.chip : color.ink }]}>
                      {c.label}
                    </Text>
                  </Press>
                );
              })}
            </View>

            <View style={styles.switches}>
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchTitle}>{t('billsManage.addAutomatically')}</Text>
                  <Text style={styles.switchHint}>
                    {auto
                      ? t('billsManage.autoOn', { day: ordinal(day) })
                      : t('billsManage.autoOff')}
                  </Text>
                </View>
                <Switch
                  value={auto}
                  onChange={setAuto}
                  accessibilityLabel={t('billsManage.addAutomatically')}
                />
              </View>
              <View style={[styles.switchRow, styles.remindRow]}>
                <Text style={[styles.switchTitle, styles.switchText]}>
                  {t('remindersScreen.remindBefore')}
                </Text>
                <Switch
                  value={remind}
                  onChange={setRemind}
                  accessibilityLabel={t('remindersScreen.remindBefore')}
                />
              </View>
            </View>

            <View style={styles.actions}>
              {bill ? (
                <Press
                  accessibilityRole="button"
                  onPress={() => {
                    close();
                    deleteBill(db, bill.id);
                  }}
                  style={styles.delete}
                >
                  <Text style={styles.deleteText}>{t('billsManage.delete')}</Text>
                </Press>
              ) : null}
              <Press
                accessibilityRole="button"
                accessibilityState={{ disabled: !ready }}
                disabled={!ready}
                haptic
                onPress={() => save(close)}
                style={[styles.save, !ready && styles.saveOff]}
              >
                <Text style={styles.saveText}>
                  {bill ? t('billsManage.save') : t('billsManage.addButton')}
                </Text>
              </Press>
            </View>
          </>
        )}
      </Sheet>

      {pickingDay ? (
        <Sheet
          accessibilityLabel={t('billsManage.pickDay')}
          onDismissed={() => setPickingDay(false)}
        >
          {(close) => (
            <View>
              <Text style={styles.pickTitle}>{t('billsManage.pickDay')}</Text>
              <View accessibilityRole="radiogroup" style={styles.days}>
                {DAYS.map((d) => (
                  <Press
                    key={d}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: d === day }}
                    accessibilityLabel={ordinal(d)}
                    onPress={() => {
                      setDay(d);
                      close();
                    }}
                    style={[styles.day, d === day && styles.dayOn]}
                  >
                    <Text style={[styles.dayText, d === day && styles.dayTextOn]}>{d}</Text>
                  </Press>
                ))}
              </View>
            </View>
          )}
        </Sheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 14,
    height: size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: color.ink,
  },
  close: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fields: { marginTop: 16, gap: 8 },
  field: {
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: { width: 110, fontFamily: fontFamily.bold, fontSize: 15, color: color.muted },
  input: {
    flex: 1,
    height: 56,
    textAlign: 'right',
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: color.ink,
  },
  symbol: {
    marginLeft: 'auto',
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: color.subtle,
  },
  amountInput: { flex: 0, width: 96, fontVariant: ['tabular-nums'] },
  dueField: { paddingRight: 10 },
  dueLabel: { flex: 1, width: undefined },
  dueButton: {
    height: 36,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: color.dueChip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: { fontFamily: fontFamily.bold, fontSize: 15, color: color.ink },
  chips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center' },
  chipText: { fontFamily: fontFamily.bold, fontSize: 14 },
  switches: {
    marginTop: 12,
    paddingVertical: 4,
    paddingLeft: 18,
    paddingRight: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
  },
  switchRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { flex: 1, gap: 2 },
  remindRow: { minHeight: 56 },
  switchTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: color.ink },
  switchHint: { fontFamily: fontFamily.semibold, fontSize: 12, color: color.muted },
  actions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  delete: {
    width: 128,
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontFamily: fontFamily.bold, fontSize: 16, color: color.danger },
  save: {
    flex: 1,
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    boxShadow: shadow.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOff: { backgroundColor: color.disabled, boxShadow: 'none' },
  saveText: { fontFamily: fontFamily.bold, fontSize: 17, color: color.white },
  pickTitle: { ...text.section, color: color.ink, textAlign: 'center', marginTop: 14 },
  days: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  day: {
    width: 40,
    height: 44,
    borderRadius: 14,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: color.ink },
  dayText: { ...text.label, color: color.ink },
  dayTextOn: { color: color.white },
});
