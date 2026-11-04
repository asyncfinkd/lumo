import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AmountDisplay, groupTyped } from '@/components/AmountDisplay';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import {
  CalendarIcon,
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
import type { Transaction, Transfer } from '@/db/schema';
import { addDays, type CalendarDate } from '@/domain/dates';
import type { TransactionKind } from '@/domain/leftToSpend';
import { type CurrencyCode, currencies, parseAmount } from '@/domain/money';
import { AccountPicker } from '@/features/accounts/AccountPicker';
import { AccountRow } from '@/features/accounts/AccountRow';
import { type AccountView, useAccountViews } from '@/features/accounts/accounts';
import { lastUsedAccount } from '@/features/accounts/lastUsed';
import { accountsQuery, addTransfer, updateTransfer } from '@/features/accounts/repo';
import { useTransferView } from '@/features/accounts/useTransferView';
import { useCategories } from '@/features/categories/categories';
import { useAllTransactions, useMoneyMonth, useTransfers } from '@/features/live';
import {
  editedTitle,
  occurredAt,
  pickableDays,
  shortDate,
  transactionTitle,
} from '@/features/transactions/addForm';
import { clockTime } from '@/features/home/home';
import { addTransaction, type Scope, updateTransaction } from '@/features/transactions/repo';
import { color, fontFamily, radius, shadow, size, text } from '@/theme';

// AddTransaction: type, amount, a line on how it lands, category, date, note.
// Saves a `manual` transaction; Home updates through live queries.
// With `id` it's EditTransaction: the same sheet, filled in, with Delete and
// Save. `scope` is what EditScope chose for a bill or salary payment; `under`
// counts the screens below (the details sheet) that close when it's deleted.
// With two or more accounts it also moves money between them (#21);
// `type=transfer` opens it there; `transfer=<id>` edits that move. Expenses and
// income then say which account paid or got it (AddTransaction-Account).
export default function AddTransactionScreen() {
  const { id, scope, under, type, transfer } = useLocalSearchParams<{
    id?: string;
    scope?: Scope;
    under?: string;
    type?: 'transfer';
    transfer?: string;
  }>();
  const transactions = useAllTransactions();
  const transfers = useTransfers();
  if (transfer) {
    const move = transfers.find((x) => x.id === transfer);
    // Wait for the live query, as below.
    if (!move) return null;
    return <TransactionForm move={move} under={Number(under ?? 0)} />;
  }
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
  move,
}: {
  existing?: Transaction;
  scope?: Scope;
  under?: number;
  transfer?: boolean;
  /** The transfer being edited (TransactionDetail-Transfer → Edit). */
  move?: Transfer;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { today, profile, summary } = useMoneyMonth();
  const transactions = useAllTransactions();

  const currency: CurrencyCode = profile?.currency ?? existing?.currency ?? 'GEL';
  const accounts = useAccountViews();
  const transferView = useTransferView();
  // Moving money needs somewhere to move it; editing a transaction never does.
  // Counted once up front too, so the sheet doesn't change shape when the live
  // list arrives a render later.
  const [initialCount] = useState(() => accountsQuery(db).all().length);
  const multi = !existing && (accounts.length || initialCount) > 1;
  const [chosen, setMode] = useState<Mode>(
    existing?.kind ?? (transfer || move ? 'transfer' : 'expense'),
  );
  const mode: Mode = chosen === 'transfer' && !multi ? 'expense' : chosen;
  const moving = mode === 'transfer';
  const kind: TransactionKind = moving ? 'expense' : mode;
  // The live list can arrive after the first render: until one is picked,
  // money moves from the first account to the next.
  const [fromPick, setFromPick] = useState(move?.fromAccountId);
  const [toPick, setToPick] = useState(move?.toAccountId);
  const from = fromPick ?? accounts[0]?.id;
  const to = toPick ?? accounts.find((a) => a.id !== from)?.id;
  const fromAccount = accounts.find((a) => a.id === from);
  const toAccount = accounts.find((a) => a.id === to);
  const [pickingFor, setPickingFor] = useState<'from' | 'to' | 'pay' | null>(null);
  // Per kind, so switching Expense ↔ Income keeps each one's own account.
  const [payPick, setPayPick] = useState<Partial<Record<TransactionKind, string>>>({});
  const [typed, setTyped] = useState(() => {
    const start = existing ?? move;
    return start ? typedAmount(start.amountMinor, currency) : '0';
  });
  const [picked, setPicked] = useState<CategoryId | null>(existing?.categoryId ?? null);
  const [date, setDate] = useState<CalendarDate | null>(existing?.date ?? move?.date ?? null);
  const [note, setNote] = useState(existing?.note ?? move?.note ?? '');
  const [writingNote, setWritingNote] = useState(false);
  const [pickingDay, setPickingDay] = useState(false);
  // Set on save: the sheet keeps showing what it said while it slides away,
  // instead of the line recomputed with the new transaction.
  const [saved, setSaved] = useState<{ income: boolean } | null>(null);

  const categories = useCategories();
  const adjust = existing?.source === 'adjustment';
  // "Paid from" / "Goes to": with two or more accounts, for what you add
  // yourself. Bills and salary keep the account their bill or income has.
  const showPay =
    accounts.length > 1 && !moving && !adjust && (!existing || existing.source === 'manual');
  const lastUsed = useMemo(
    () =>
      showPay && !existing
        ? lastUsedAccount(
            transactions,
            kind,
            accounts.map((a) => a.id),
          )
        : undefined,
    [showPay, existing, transactions, kind, accounts],
  );
  const pay = payPick[kind] ?? existing?.accountId ?? lastUsed;
  const payAccount = accounts.find((a) => a.id === pay);
  // Room for the account rows: a tighter sheet and keypad.
  const tight = multi || showPay;
  const options = categories.ofKind(kind);
  const category = adjust
    ? null
    : picked && options.some((c) => c.id === picked)
      ? picked
      : (options[0]?.id ?? null);
  const day = date ?? today;
  const amountMinor = parseAmount(typed, currency) ?? 0;
  const categoryName = (id: CategoryId | null) => categories.get(id).label;

  // Income says where it lands; an expense has nothing to be measured against.
  const incomeLine = saved ? saved.income : kind === 'income';

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

  // Cash and debit accounts can't go below zero (#21): what each account holds
  // after this move (and, editing one, without the old one) can't drop under
  // zero, or under what it holds now if it's already there.
  const after = (a: AccountView) =>
    a.balanceMinor +
    (move?.fromAccountId === a.id ? move.amountMinor : 0) -
    (move?.toAccountId === a.id ? move.amountMinor : 0) -
    (a.id === from ? amountMinor : 0) +
    (a.id === to ? amountMinor : 0);
  const canMove =
    !!fromAccount && !!toAccount && accounts.every((a) => after(a) >= Math.min(0, a.balanceMinor));
  // A second tap while the sheet slides away would move the money twice.
  const moved = useRef(false);

  const save = (close: () => void) => {
    if (amountMinor <= 0 || saved) return;
    if (moving) {
      if (!from || !to || !canMove || moved.current) return;
      moved.current = true;
      const input = {
        fromAccountId: from,
        toAccountId: to,
        amountMinor,
        date: day,
        note: note.trim() || null,
      };
      if (move) {
        const at = new Date(move.occurredAt);
        updateTransfer(db, move.id, {
          ...input,
          occurredAt: day === move.date ? at : occurredAt(day, at),
        });
      } else addTransfer(db, { ...input, occurredAt: occurredAt(day, new Date()) });
      close();
      return;
    }
    setSaved({ income: kind === 'income' });
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
          accountId: showPay ? pay : undefined,
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
      accountId: showPay ? pay : undefined,
    });
    close();
  };

  const title = move
    ? t('history.transfer.edit')
    : existing
      ? kind === 'expense'
        ? t('history.edit.editExpense')
        : t('history.edit.editIncome')
      : moving
        ? t('addTransaction.moveMoney')
        : kind === 'expense'
          ? t('addTransaction.newExpense')
          : t('addTransaction.newIncome');
  const typedMoney = `${currencies[currency].symbol}${groupTyped(typed)}`;
  // What AccountPicker shows and sets for each row that opens it.
  const pickers = {
    pay: {
      title: t(kind === 'income' ? 'accounts.pickGets' : 'accounts.pickPaid'),
      value: pay,
      onPick: (id: string) => setPayPick((p) => ({ ...p, [kind]: id })),
    },
    from: {
      title: t('accounts.pickFrom'),
      value: from,
      onPick: (id: string) => pickAccount('from', id),
    },
    to: { title: t('accounts.pickTo'), value: to, onPick: (id: string) => pickAccount('to', id) },
  };

  // "Fresh Market · added today, 13:15"
  const editing = existing ?? move;
  const added = editing
    ? t(
        editing.date === today
          ? 'history.edit.addedToday'
          : editing.date === addDays(today, -1)
            ? 'history.edit.addedYesterday'
            : 'history.edit.addedOn',
        {
          name: move
            ? transferView(move).between
            : adjust
              ? t('history.adjusted')
              : existing!.title,
          date: shortDate(editing.date, i18n.language),
          time: clockTime(editing.occurredAt),
        },
      )
    : null;

  return (
    <>
      <Sheet top={tight ? 72 : 96} accessibilityLabel={title} onDismissed={router.back}>
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

            {/* A move stays a move: it can't turn into spending. */}
            {move ? null : (
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
            )}

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
            ) : moving ? null : incomeLine ? (
              <View style={styles.messageRow}>
                <IncomePill account={showPay ? payAccount?.label : undefined} />
              </View>
            ) : null}

            {moving ? (
              fromAccount && toAccount ? (
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
              ) : null
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

            {showPay && payAccount ? (
              <AccountRow
                compact
                style={styles.payRow}
                label={t(kind === 'income' ? 'addTransaction.goesTo' : 'addTransaction.paidFrom')}
                a11y={t(
                  kind === 'income' ? 'addTransaction.goesToLabel' : 'addTransaction.paidFromLabel',
                  { name: payAccount.label },
                )}
                account={payAccount}
                currency={currency}
                onPress={() => setPickingFor('pay')}
              />
            ) : null}

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

            <View style={[styles.keys, tight && styles.keysTight]}>
              <Numpad
                value={typed}
                onChange={setTyped}
                currency={currency}
                keyHeight={tight ? 44 : undefined}
              />
            </View>

            {editing ? (
              <View style={styles.editActions}>
                <Press
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: move ? '/transfer-delete' : '/transaction-delete',
                      params: { id: editing.id, close: String(2 + under) },
                    })
                  }
                  style={styles.delete}
                >
                  <TrashIcon color={color.danger} />
                  <Text style={styles.deleteText}>{t('history.edit.delete')}</Text>
                </Press>
                <Button
                  label={t('history.edit.save')}
                  disabled={amountMinor <= 0 || (moving && !canMove)}
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
                disabled={amountMinor <= 0 || (moving && !canMove)}
                onPress={() => save(close)}
                style={styles.save}
              />
            )}
          </>
        )}
      </Sheet>

      {pickingFor ? (
        <AccountPicker
          title={pickers[pickingFor].title}
          accounts={accounts}
          value={pickers[pickingFor].value ?? ''}
          currency={currency}
          onPick={pickers[pickingFor].onPick}
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

/** Under the amount while adding income: where it lands. */
function IncomePill({
  account,
}: {
  /** With two or more accounts: where income goes. */
  account?: string;
}) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.message, { backgroundColor: color.goodSoft }]}
    >
      <Text style={[styles.messageText, { color: color.good }]}>
        {account
          ? t('addTransaction.message.incomeTo', { name: account })
          : t('addTransaction.message.income')}
      </Text>
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
  payRow: { marginTop: 12 },
  transferLine: { marginHorizontal: 14, height: 1, backgroundColor: color.hairline },
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
