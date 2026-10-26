import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AmountDisplay, groupTyped } from '@/components/AmountDisplay';
import { Button } from '@/components/Button';
import { Numpad, typedAmount } from '@/components/Numpad';
import { Sheet } from '@/components/Sheet';
import { db } from '@/db/client';
import { currencies, parseAmount } from '@/domain/money';
import { useToday } from '@/features/live';
import { adjustBalance, currentBalance, getProfile } from '@/features/profile/repo';
import { color, text } from '@/theme';

// "Add your balance" / changing it from Home (#6): the user types what they
// really have and Lumo stores the difference as an adjustment.
export default function BalanceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const today = useToday();
  // Read once on open: the sheet starts from the balance as it is now.
  const [currency] = useState(() => getProfile(db)?.currency ?? 'GEL');
  const [typed, setTyped] = useState(() => {
    const current = currentBalance(db);
    return current !== null && current > 0 ? typedAmount(current, currency) : '0';
  });

  const save = (close: () => void) => {
    const minor = parseAmount(typed, currency);
    if (minor === null) return;
    adjustBalance(db, minor, today);
    close();
  };

  return (
    <Sheet accessibilityLabel={t('balance.title')} onDismissed={router.back}>
      {(close) => (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            {t('balance.title')}
          </Text>
          <Text style={styles.hint}>{t('balance.hint')}</Text>
          <View style={styles.amount}>
            <AmountDisplay
              typed={typed}
              currency={currency}
              accessibilityLabel={t('balance.amountLabel', {
                amount: `${currencies[currency].symbol}${groupTyped(typed)}`,
              })}
            />
          </View>
          <Numpad value={typed} onChange={setTyped} currency={currency} />
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
});
