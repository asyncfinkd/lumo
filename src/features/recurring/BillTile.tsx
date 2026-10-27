import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BillIcon, CategoryIcon } from '@/components/Icons';
import { useCategories } from '@/features/categories/categories';
import { BILL_KEYS } from '@/features/onboarding/bills';
import { billColor } from '@/theme';

/**
 * A bill's icon tile (ProfileBills). Bills from onboarding keep their own icon
 * ("Internet", "Gym"); any other bill shows its category's.
 */
export function BillTile({ name, categoryId }: { name: string; categoryId: string | null }) {
  const { t } = useTranslation();
  const categories = useCategories();
  const key = BILL_KEYS.find(
    (k) =>
      k !== 'other' && t(`onboarding.bills.items.${k}`).toLowerCase() === name.trim().toLowerCase(),
  );
  if (key) {
    const c = billColor[key];
    return (
      <View style={[styles.tile, { backgroundColor: c.bg }]}>
        <BillIcon name={key} color={c.fg} />
      </View>
    );
  }
  const category = categories.get(categoryId);
  return (
    <View style={[styles.tile, { backgroundColor: category.tint.bg }]}>
      <CategoryIcon icon={category.icon} size={22} color={category.tint.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
