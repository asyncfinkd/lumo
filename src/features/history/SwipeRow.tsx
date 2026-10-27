import { type ReactNode, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTranslation } from 'react-i18next';
import { NoteIcon, TrashIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { color, fontFamily, shadow } from '@/theme';

/** Only one row stays open: opening another closes the last. */
let openRow: SwipeableMethods | null = null;

/**
 * HistorySwipe: drag a row left for Edit and Delete. The buttons sit under the
 * row, so they only show once a drag starts; the row turns opaque with a
 * white, rounded edge until it's closed again.
 */
export function SwipeRow({
  onEdit,
  onDelete,
  children,
}: {
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<SwipeableMethods>(null);
  const [active, setActive] = useState(false);

  const act = (then: () => void) => {
    ref.current?.close();
    then();
  };

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.5}
      rightThreshold={48}
      overshootRight={false}
      onSwipeableOpenStartDrag={() => {
        if (openRow && openRow !== ref.current) openRow.close();
        openRow = ref.current;
        setActive(true);
      }}
      onSwipeableClose={() => setActive(false)}
      childrenContainerStyle={[styles.row, active && styles.rowOpen]}
      renderRightActions={() => (
        <View style={[styles.actions, { opacity: active ? 1 : 0 }]}>
          <Press
            accessibilityRole="button"
            onPress={() => act(onEdit)}
            style={[styles.action, { backgroundColor: color.track }]}
          >
            <NoteIcon color={color.ink} size={20} />
            <Text style={styles.actionText}>{t('history.swipe.edit')}</Text>
          </Press>
          <Press
            accessibilityRole="button"
            haptic
            onPress={() => act(onDelete)}
            style={[styles.action, { backgroundColor: color.dangerStrong }]}
          >
            <TrashIcon color={color.white} />
            <Text style={[styles.actionText, { color: color.white }]}>
              {t('history.swipe.delete')}
            </Text>
          </Press>
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: { paddingLeft: 12, paddingRight: 16 },
  rowOpen: {
    backgroundColor: color.rowOpen,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    boxShadow: shadow.rowOpen,
  },
  actions: { paddingVertical: 6, paddingLeft: 8, paddingRight: 12, flexDirection: 'row', gap: 8 },
  action: {
    width: 64,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionText: { fontFamily: fontFamily.bold, fontSize: 12, color: color.ink },
});
