import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AmountDisplay, groupTyped } from '@/components/AmountDisplay';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import {
  AccountIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  CloseIcon,
  InfoIcon,
  NoteIcon,
  SwapIcon,
  TrashIcon,
} from '@/components/Icons';
import { Numpad, typedAmount } from '@/components/Numpad';
import { Press } from '@/components/Press';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import type { CategoryId } from '@/db/categories';
import { db } from '@/db/client';
import type { Transaction } from '@/db/schema';
import { addDays, type CalendarDate } from '@/domain/dates';
import type { TransactionKind } from '@/domain/leftToSpend';
import { type CurrencyCode, currencies, formatMoney, parseAmount } from '@/domain/money';
import { AccountPicker } from '@/features/accounts/AccountPicker';
import { type AccountView, useAccountViews } from '@/features/accounts/accounts';
import { addTransfer } from '@/features/accounts/repo';
import { useCategories } from '@/features/categories/categories';
import { CATEGORY_EMOJI } from '@/features/categoryEmoji';
import { useActiveBills, useAllTransactions, useBudgets, useMoneyMonth } from '@/features/live';
import { type AddMessage, addMessage, messageTone } from '@/features/transactions/addMessage';
import {
  editedTitle,
  occurredAt,
  pickableDays,
  shortDate,
  transactionTitle,
} from '@/features/transactions/addForm';
import { clockTime } from '@/features/home/home';
import { addTransaction, type Scope, updateTransaction } from '@/features/transactions/repo';
import { BUDGETING } from '@/features/flags';
import { color, fontFamily, radius, shadow, size, text } from '@/theme';

// AddTransaction: type, amount, a line on how it lands, category, date, note.
// Saves a `manual` transaction; Home and budgets update through live queries.
// With `id` it's EditTransaction: the same sheet, filled in, with Delete and
// Save. `scope` is what EditScope chose for a bill or salary payment; `under`
// counts the screens below (the details sheet) that close when it's deleted.
// With two or more accounts it also moves money between them (#21);
// `type=transfer` opens it there.
export default function AddTransactionScreen() {
  const { id, scope, under, type } = useLocalSearchParams<{
    id?: string;
    scope?: Scope;
    under?: string;
    type?: 'transfer';
  }>();
  const transactions = useAllTransactions();
  if (!id) return <TransactionForm transfer={type === 'transfer'} />;
  const existing = transactions.find((x) => x.id === id);
  // Wait for the live query, so the form starts filled in.
  if (!existing) return null;
  return <TransactionForm existing={existing} scope={scope ?? 'one'} under={Number(under ?? 0)} />;
}

type Mode = TransactionKind | 'transfer';

function TransactionForm({
  existing,
  scope = 'one',
  under = 0,
  transfer = false,
}: {
  existing?: Transaction;
  scope?: Scope;
  under?: number;
  transfer?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { today, profile, summary } = useMoneyMonth();
  const budgets = useBudgets();
  const bills = useActiveBills();
  const transactions = useAllTransactions();

  const currency: CurrencyCode = profile?.currency ?? existing?.currency ?? 'GEL';
  const accounts = useAccountViews();
  // Moving money needs somewhere to move it; editing a transaction never does.
  const multi = !existing && accounts.length > 1;
  const [chosen, setMode] = useState<Mode>(existing?.kind ?? (transfer ? 'transfer' : 'expense'));
  const mode: Mode = chosen === 'transfer' && !multi ? 'expense' : chosen;
  const moving = mode === 'transfer';
  const kind: TransactionKind = moving ? 'expense' : mode;
  // The live list can arrive after the first render: until one is picked,
  // money moves from the first account to the next.
  const [fromPick, setFromPick] = useState<string>();
  const [toPick, setToPick] = useState<string>();
  const from = fromPick ?? accounts[0]?.id;
  const to = toPick ?? accounts.find((a) => a.id !== from)?.id;
  const [pickingFor, setPickingFor] = useState<'from' | 'to' | null>(null);
  const [typed, setTyped] = useState(existing ? typedAmount(existing.amountMinor, currency) : '0');
  const [picked, setPicked] = useState<CategoryId | null>(existing?.categoryId ?? null);
  const [date, setDate] = useState<CalendarDate | null>(existing?.date ?? null);
  const [note, setNote] = useState(existing?.note ?? '');
  const [writingNote, setWritingNote] = useState(false);
  const [pickingDay, setPickingDay] = useState(false);
  // Set on save: the sheet keeps showing what it said while it slides away,
  // instead of the line recomputed with the new transaction.
  const [savedMessage, setSavedMessage] = useState<AddMessage | null>(null);

  const categories = useCategories();
  const adjust = existing?.source === 'adjustment';
  const options = categories.ofKind(kind);
  const category = adjust
    ? null
    : picked && options.some((c) => c.id === picked)
      ? picked
      : (options[0]?.id ?? null);
  const day = date ?? today;
  const amountMinor = parseAmount(typed, currency) ?? 0;
  const categoryName = (id: CategoryId | null) => categories.get(id).label;

  // Without budgeting there's nothing to measure an expense against.
  const live: AddMessage | null = !BUDGETING
    ? kind === 'income'
      ? { type: 'income' }
      : null
    : summary
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

  const pickAccount = (side: 'from' | 'to', id: string) => {
    // Picking the other side's account swaps them.
    const other = side === 'from' ? to : from;
    const mine = side === 'from' ? from : to;
    const nextFrom = side === 'from' ? id : id === other ? mine : other;
    const nextTo = side === 'to' ? id : id === other ? mine : other;
    setFromPick(nextFrom);
    setToPick(nextTo);
  };

  const save = (close: () => void) => {
    if (amountMinor <= 0 || savedMessage) return;
    if (moving) {
      if (!from || !to) return;
      addTransfer(db, {
        fromAccountId: from,
        toAccountId: to,
        amountMinor,
        date: day,
        note: note.trim() || null,
        occurredAt: occurredAt(day, new Date()),
      });
      close();
      return;
    }
    setSavedMessage(live);
    if (existing) {
      const at = new Date(existing.occurredAt);
      updateTransaction(
        db,
        existing.id,
        {
          kind,
          amountMinor,
          categoryId: category,
          // Bills, salary and adjustments keep their names; what you typed is the title.
          title:
            existing.source === 'manual'
              ? editedTitle(
                  existing,
                  categoryName(existing.categoryId),
                  note,
                  categoryName(category),
                )
              : existing.title,
          note: note.trim() || null,
          date: day,
          occurredAt: day === existing.date ? at : occurredAt(day, at),
        },
        scope,
      );
      close();
      return;
    }
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

  const title = existing
    ? kind === 'expense'
      ? t('history.edit.editExpense')
      : t('history.edit.editIncome')
    : moving
      ? t('addTransaction.moveMoney')
      : kind === 'expense'
        ? t('addTransaction.newExpense')
        : t('addTransaction.newIncome');
  const typedMoney = `${currencies[currency].symbol}${groupTyped(typed)}`;
  const fromAccount = accounts.find((a) => a.id === from);
  const toAccount = accounts.find((a) => a.id === to);

  // "Fresh Market · added today, 13:15"
  const added = existing
    ? t(
        existing.date === today
          ? 'history.edit.addedToday'
          : existing.date === addDays(today, -1)
            ? 'history.edit.addedYesterday'
            : 'history.edit.addedOn',
        {
          name: adjust ? t('history.adjusted') : existing.title,
          date: shortDate(existing.date, i18n.language),
          time: clockTime(existing.occurredAt),
        },
      )
    : null;

  return (
    <>
      <Sheet top={multi ? 72 : 96} accessibilityLabel={title} onDismissed={router.back}>
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
                  { value: 'expense' as Mode, label: t('addTransaction.expense') },
                  { value: 'income' as Mode, label: t('addTransaction.income') },
                  ...(multi
                    ? [{ value: 'transfer' as Mode, label: t('addTransaction.transfer') }]
                    : []),
                ]}
                value={mode}
                onChange={(next) => {
                  setMode(next);
                  setPicked(null);
                }}
              />
            </View>

            <View style={styles.amount}>
              <AmountDisplay
                typed={typed}
                currency={currency}
                accessibilityLabel={t('addTransaction.amountLabel', { amount: typedMoney })}
              />
            </View>

            {added ? (
              <View style={styles.messageRow}>
                <View style={[styles.message, styles.added]}>
                  <ClockIcon color={color.muted} />
                  <Text numberOfLines={1} style={styles.addedText}>
                    {added}
                  </Text>
                </View>
              </View>
            ) : moving ? null : message ? (
              <View style={styles.messageRow}>
                <MessagePill message={message} currency={currency} />
              </View>
            ) : null}

            {moving && fromAccount && toAccount ? (
              <>
                <View style={styles.transfer}>
                  <AccountRow
                    label={t('addTransaction.from')}
                    a11y={t('addTransaction.fromLabel', { name: fromAccount.label })}
                    account={fromAccount}
                    currency={currency}
                    onPress={() => setPickingFor('from')}
                  />
                  <View style={styles.transferLine} />
                  <AccountRow
                    label={t('addTransaction.to')}
                    a11y={t('addTransaction.toLabel', { name: toAccount.label })}
                    account={toAccount}
                    currency={currency}
                    onPress={() => setPickingFor('to')}
                  />
                  <Press
                    accessibilityRole="button"
                    accessibilityLabel={t('addTransaction.swap')}
                    hitSlop={5}
                    onPress={() => {
                      setFromPick(to);
                      setToPick(from);
                    }}
                    style={styles.swap}
                  >
                    <SwapIcon color={color.ink} />
                  </Press>
                </View>
                <View style={styles.notSpending}>
                  <InfoIcon color={color.muted} />
                  <Text style={styles.notSpendingText}>{t('addTransaction.notSpending')}</Text>
                </View>
              </>
            ) : adjust ? null : (
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
            )}

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

            <View style={[styles.keys, multi && styles.keysTight]}>
              <Numpad
                value={typed}
                onChange={setTyped}
                currency={currency}
                keyHeight={multi ? 44 : undefined}
              />
            </View>

            {existing ? (
              <View style={styles.editActions}>
                <Press
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/transaction-delete',
                      params: { id: existing.id, close: String(2 + under) },
                    })
                  }
                  style={styles.delete}
                >
                  <TrashIcon color={color.danger} />
                  <Text style={styles.deleteText}>{t('history.edit.delete')}</Text>
                </Press>
                <Button
                  label={t('history.edit.save')}
                  disabled={amountMinor <= 0}
                  onPress={() => save(close)}
                  style={styles.editSave}
                />
              </View>
            ) : (
              <Button
                label={
                  moving
                    ? t('addTransaction.moveAmount', { amount: typedMoney })
                    : kind === 'expense'
                      ? t('addTransaction.addExpense')
                      : t('addTransaction.addIncome')
                }
                disabled={amountMinor <= 0 || (moving && (!from || !to))}
                onPress={() => save(close)}
                style={styles.save}
              />
            )}
          </>
        )}
      </Sheet>

      {pickingFor ? (
        <AccountPicker
          title={pickingFor === 'from' ? t('accounts.pickFrom') : t('accounts.pickTo')}
          accounts={accounts}
          value={(pickingFor === 'from' ? from : to) ?? ''}
          currency={currency}
          onPick={(id) => pickAccount(pickingFor, id)}
          onDismissed={() => setPickingFor(null)}
        />
      ) : null}

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

function AccountRow({
  label,
  a11y,
  account,
  currency,
  onPress,
}: {
  label: string;
  a11y: string;
  account: AccountView;
  currency: CurrencyCode;
  onPress: () => void;
}) {
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={styles.accountRow}
    >
      <View style={[styles.accountTile, { backgroundColor: account.tint.bg }]}>
        <AccountIcon kind={account.kind} size={20} width={1.9} color={account.tint.fg} />
      </View>
      <View style={styles.accountText}>
        <Text style={styles.accountLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.accountName}>
          {account.label}
        </Text>
      </View>
      <Text style={styles.accountAmount}>{formatMoney(account.balanceMinor, currency)}</Text>
      <ChevronDownIcon color={color.muted} />
    </Press>
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
  added: { backgroundColor: color.calmSoft, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addedText: { fontFamily: fontFamily.bold, fontSize: 13, color: color.muted, flexShrink: 1 },
  editActions: { marginTop: 16, flexDirection: 'row', gap: 10 },
  delete: {
    width: 128,
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteText: { fontFamily: fontFamily.bold, fontSize: 16, color: color.danger },
  editSave: { flex: 1, boxShadow: shadow.cta },
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
  keysTight: { marginTop: 14 },
  transfer: {
    marginTop: 18,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
  },
  transferLine: { marginHorizontal: 14, height: 1, backgroundColor: 'rgba(43,37,34,0.07)' },
  accountRow: {
    height: 62,
    paddingLeft: 10,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: { flex: 1, minWidth: 0 },
  accountLabel: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 15, color: color.muted },
  accountName: { fontFamily: fontFamily.extrabold, fontSize: 15, lineHeight: 19, color: color.ink },
  accountAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    color: color.muted,
  },
  swap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: 17,
    backgroundColor: color.white,
    boxShadow: '0px 4px 12px -4px rgba(43,37,34,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notSpending: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  notSpendingText: { fontFamily: fontFamily.bold, fontSize: 13, color: color.muted },
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
