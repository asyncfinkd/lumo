import { StyleSheet, Text, View } from 'react-native';
import type { CategoryId } from '@/db/categories';
import { categoryColor, color, radius, shadow, size, text } from '@/theme';
import { Press } from './Press';

type Props = {
  category: CategoryId;
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** A category to pick, as in the add sheet: a colored dot and its name. */
export function Chip({ category, label, selected, onPress }: Props) {
  const c = categoryColor[category];
  return (
    <Press
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: c.selected, boxShadow: shadow.chipSelected(c.fg) }
          : { backgroundColor: color.wash },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: selected ? color.chipDot : c.bg }]}>
        <View style={[styles.dotInner, { backgroundColor: c.fg }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: size.chip,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: radius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 8, height: 8, borderRadius: 4 },
  label: { ...text.label, color: color.ink },
});
