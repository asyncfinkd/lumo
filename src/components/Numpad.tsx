import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type CurrencyCode, currencies } from '@/domain/money';
import { color, radius, shadow, size, text } from '@/theme';
import { BackspaceIcon } from './Icons';
import { Press } from './Press';

export type NumpadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

const ROWS: NumpadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];

/** Largest whole part the keypad accepts: 9,999,999. */
const MAX_WHOLE_DIGITS = 7;

/**
 * The typed amount after one key. Text stays text until `parseAmount` turns it
 * into minor units, so no float ever touches it (ADR 0003). Keys that would
 * make it invalid are ignored.
 */
export function pressKey(current: string, key: NumpadKey, currency: CurrencyCode): string {
  const { minorUnits } = currencies[currency];
  if (key === 'back') return current.length > 1 ? current.slice(0, -1) : '0';

  const dot = current.indexOf('.');
  if (key === '.') return dot >= 0 || minorUnits === 0 ? current : current + '.';
  if (dot >= 0 && current.length - dot - 1 >= minorUnits) return current;
  if (dot < 0 && current !== '0' && current.length >= MAX_WHOLE_DIGITS) return current;
  return current === '0' ? key : current + key;
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  currency: CurrencyCode;
};

/** The design's 3 × 4 keypad, with a light haptic on every key. */
export function Numpad({ value, onChange, currency }: Props) {
  const { t } = useTranslation();
  const label = (key: NumpadKey) =>
    key === 'back'
      ? t('addTransaction.deleteKey')
      : key === '.'
        ? t('addTransaction.decimalKey')
        : key;

  return (
    <View style={styles.grid}>
      {ROWS.map((row) => (
        <View key={row.join('')} style={styles.row}>
          {row.map((key) => (
            <Press
              key={key}
              haptic
              accessibilityLabel={label(key)}
              onPress={() => onChange(pressKey(value, key, currency))}
              style={styles.key}
            >
              {key === 'back' ? (
                <BackspaceIcon color={color.ink} />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </Press>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1,
    height: size.key,
    borderRadius: radius.key,
    borderCurve: 'continuous',
    backgroundColor: color.key,
    boxShadow: shadow.key,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { ...text.stat, fontSize: 24, color: color.ink },
});
