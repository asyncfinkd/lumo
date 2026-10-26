import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space, text } from '@/theme';

// Temporary screen body until each feature is built.
export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  body: { flex: 1, padding: space.screen, gap: 4 },
  title: { ...text.h1, color: color.ink },
  note: { ...text.subtitle, color: color.muted },
});
