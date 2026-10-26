import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { color, size, text } from '@/theme';

// The sheet frame for adding a transaction; its content (amount, keypad,
// categories) is built in Phase 2.
export default function AddTransactionScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Sheet top={96} accessibilityLabel={t('addTransaction.newExpense')} onDismissed={router.back}>
      {(close) => (
        <>
          <View style={styles.header}>
            <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
              <CloseIcon color={color.muted} />
            </Press>
            <Text style={styles.title}>{t('addTransaction.newExpense')}</Text>
            <View style={styles.spacer} />
          </View>
          <Text style={styles.note}>{t('placeholder.addTransaction')}</Text>
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
  note: { ...text.subtitle, color: color.muted, marginTop: 24, textAlign: 'center' },
});
