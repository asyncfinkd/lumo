import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AmountDisplay, groupTyped } from '@/components/AmountDisplay';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { CalendarIcon, CloseIcon, NoteIcon } from '@/components/Icons';
import { Numpad } from '@/components/Numpad';
import { Press } from '@/components/Press';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import type { CategoryId } from '@/db/categories';
import { db } from '@/db/client';
import { addDays, type CalendarDate } from '@/domain/dates';
import type { TransactionKind } from '@/domain/leftToSpend';
import { type CurrencyCode, currencies, formatMoney, parseAmount } from '@/domain/money';
import { useCategories } from '@/features/categories/categories';
import { CATEGORY_EMOJI } from '@/features/categoryEmoji';
import { useActiveBills, useAllTransactions, useBudgets, useMoneyMonth } from '@/features/live';
import { type AddMessage, addMessage, messageTone } from '@/features/transactions/addMessage';
import {
  occurredAt,
  pickableDays,
  shortDate,
  transactionTitle,
} from '@/features/transactions/addForm';
import { addTransaction } from '@/features/transactions/repo';
import { color, radius, size, text } from '@/theme';

// AddTransaction: type, amount, a line on how it lands, category, date, note.
// Saves a `manual` transaction; Home and budgets update through live queries.
export default function AddTransactionScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { today, profile, summary } = useMoneyMonth();
  const budgets = useBudgets();
  const bills = useActiveBills();
  const transactions = useAllTransactions();

  const [kind, setKind] = useState<TransactionKind>('expense');
  const [typed, setTyped] = useState('0');
  const [picked, setPicked] = useState<CategoryId | null>(null);
  const [date, setDate] = useState<CalendarDate | null>(null);
  const [note, setNote] = useState('');
  const [writingNote, setWritingNote] = useState(false);
  const [pickingDay, setPickingDay] = useState(false);
  // Set on save: the sheet keeps showing what it said while it slides away,
  // instead of the line recomputed with the new transaction.
  const [savedMessage, setSavedMessage] = useState<AddMessage | null>(null);

  const currency: CurrencyCode = profile?.currency ?? 'GEL';
  const categories = useCategories();
  const options = categories.ofKind(kind);
  const category =
    picked && options.some((c) => c.id === picked) ? picked : (options[0]?.id ?? null);
  const day = date ?? today;
  const amountMinor = parseAmount(typed, currency) ?? 0;
  const categoryName = (id: CategoryId | null) => categories.get(id).label;

  const live = summary
    ? addMessage({
        kind,
        category,
        amountMinor,
        budgets,
        bills,
        transactions,
        period: summary.period,
        left: summary.left,
      })
    : null;
  const message = savedMessage ?? live;

  const dayLabel =
    day === today
      ? t('addTransaction.todayDate', { date: shortDate(day, i18n.language) })
      : day === addDays(today, -1)
        ? t('addTransaction.yesterdayDate', { date: shortDate(day, i18n.language) })
        : shortDate(day, i18n.language);

  const save = (close: () => void) => {
    if (amountMinor <= 0 || savedMessage) return;
    setSavedMessage(live);
    addTransaction(db, {
      kind,
      amountMinor,
      categoryId: category,
      title: transactionTitle(note, categoryName(category)),
      note: note.trim() || null,
      date: day,
      occurredAt: occurredAt(day, new Date()),
    });
    close();
  };

  const title = kind === 'expense' ? t('addTransaction.newExpense') : t('addTransaction.newIncome');

  return (
    <>
      <Sheet top={96} accessibilityLabel={title} onDismissed={router.back}>
        {(close) => (
          <>
            <View style={styles.header}>
              <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
                <CloseIcon color={color.muted} />
              </Press>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <View style={styles.spacer} />
            </View>

            <View style={styles.type}>
              <SegmentedControl
                accessibilityLabel={t('addTransaction.type')}
                options={[
                  { value: 'expense', label: t('addTransaction.expense') },
                  { value: 'income', label: t('addTransaction.income') },
                ]}
                value={kind}
                onChange={(next) => {
                  setKind(next);
                  setPicked(null);
                }}
              />
            </View>

            <View style={styles.amount}>
              <AmountDisplay
                typed={typed}
                currency={currency}
                accessibilityLabel={t('addTransaction.amountLabel', {
                  amount: `${currencies[currency].symbol}${groupTyped(typed)}`,
                })}
              />
            </View>

            {message ? (
              <View style={styles.messageRow}>
                <MessagePill message={message} currency={currency} />
              </View>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('addTransaction.category')}
              style={styles.chips}
              contentContainerStyle={styles.chipsContent}
            >
              {options.map((c) => (
                <Chip
                  key={c.id}
                  tint={c.tint}
                  label={c.label}
                  selected={c.id === category}
                  onPress={() => setPicked(c.id)}
                />
              ))}
            </ScrollView>

            <View style={styles.extras}>
              <Press
                accessibilityLabel={dayLabel}
                accessibilityHint={t('addTransaction.pickDayHint')}
                onPress={() => setPickingDay(true)}
                style={styles.extra}
              >
                <CalendarIcon color={color.muted} />
                <Text numberOfLines={1} style={styles.extraText}>
                  {dayLabel}
                </Text>
              </Press>
              {writingNote || note ? (
                <View style={styles.extra}>
                  <NoteIcon color={color.muted} />
                  <TextInput
                    autoFocus={writingNote && !note}
                    value={note}
                    onChangeText={setNote}
                    onBlur={() => setWritingNote(false)}
                    placeholder={t('addTransaction.addNote')}
                    placeholderTextColor={color.placeholder}
                    accessibilityLabel={t('addTransaction.note')}
                    returnKeyType="done"
                    maxLength={60}
                    style={styles.noteInput}
                  />
                </View>
              ) : (
                <Press onPress={() => setWritingNote(true)} style={styles.extra}>
                  <NoteIcon color={color.muted} />
                  <Text style={[styles.extraText, styles.extraQuiet]}>
                    {t('addTransaction.addNote')}
                  </Text>
                </Press>
              )}
            </View>

            <View style={styles.keys}>
              <Numpad value={typed} onChange={setTyped} currency={currency} />
            </View>

            <Button
              label={
                kind === 'expense' ? t('addTransaction.addExpense') : t('addTransaction.addIncome')
              }
              disabled={amountMinor <= 0}
              onPress={() => save(close)}
              style={styles.save}
            />
          </>
        )}
      </Sheet>

      {pickingDay && summary ? (
        <Sheet
          accessibilityLabel={t('addTransaction.pickDay')}
          onDismissed={() => setPickingDay(false)}
        >
          {(close) => (
            <View>
              <Text style={styles.sheetTitle}>{t('addTransaction.pickDay')}</Text>
              <View accessibilityRole="radiogroup" style={styles.days}>
                {pickableDays(summary.period, today).map((d) => (
                  <Press
                    key={d}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: d === day }}
                    accessibilityLabel={shortDate(d, i18n.language)}
                    onPress={() => {
                      setDate(d);
                      close();
                    }}
                    style={[styles.day, d === day && styles.dayOn]}
                  >
                    <Text style={[styles.dayText, d === day && styles.dayTextOn]}>
                      {Number(d.slice(8))}
                    </Text>
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

function MessagePill({ message, currency }: { message: AddMessage; currency: CurrencyCode }) {
  const { t, i18n } = useTranslation();
  const money = (minor: number) => formatMoney(minor, currency);
  const categories = useCategories();
  const name = (id: CategoryId) => categories.get(id).label;
  const word = (id: CategoryId) => name(id).toLocaleLowerCase(i18n.language);
  const emoji = (id: CategoryId) => CATEGORY_EMOJI[id] ?? '';

  const line =
    message.type === 'income'
      ? t('addTransaction.message.income')
      : message.type === 'covered'
        ? t('addTransaction.message.covered', {
            category: name(message.category),
            emoji: emoji(message.category),
          })
        : message.type === 'stillLeft'
          ? t('addTransaction.message.stillLeft', {
              amount: money(message.amountMinor),
              category: word(message.category),
              emoji: emoji(message.category),
            })
          : message.type === 'over'
            ? t('addTransaction.message.over', {
                amount: money(message.amountMinor),
                category: word(message.category),
              })
            : message.type === 'stillLeftToSpend'
              ? t('addTransaction.message.stillLeftToSpend', { amount: money(message.amountMinor) })
              : t('addTransaction.message.overMonth', { amount: money(message.amountMinor) });

  const good = messageTone(message) === 'good';
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.message, { backgroundColor: good ? color.goodSoft : color.calmSoft }]}
    >
      <Text style={[styles.messageText, { color: good ? color.good : color.muted }]}>{line}</Text>
    </View>
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
  close: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Keeps the title centered opposite the close button.
  spacer: { width: size.touch },
  title: { ...text.section, color: color.ink },
  type: { marginTop: 14 },
  amount: { marginTop: 22 },
  messageRow: { marginTop: 10, alignItems: 'center' },
  message: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  messageText: { ...text.meta, fontFamily: text.label.fontFamily },
  chips: { marginTop: 20, marginHorizontal: -24, flexGrow: 0 },
  chipsContent: { paddingHorizontal: 24, gap: 8 },
  extras: { marginTop: 12, flexDirection: 'row', gap: 8 },
  extra: {
    flex: 1,
    height: size.touch,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  extraText: { ...text.label, fontSize: 14, color: color.ink, flexShrink: 1 },
  extraQuiet: { color: color.muted },
  noteInput: { ...text.label, fontSize: 14, color: color.ink, flex: 1, padding: 0 },
  keys: { marginTop: 20 },
  save: { marginTop: 16 },
  sheetTitle: { ...text.section, color: color.ink, textAlign: 'center', marginTop: 14 },
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
