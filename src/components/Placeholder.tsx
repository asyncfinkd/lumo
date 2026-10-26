import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Temporary screen body until each feature is built. Colors and text move to
// theme tokens (#31) and i18n (#35).
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
  root: { flex: 1, backgroundColor: '#FBF7F2' },
  body: { flex: 1, padding: 24, gap: 4 },
  title: { fontSize: 28, lineHeight: 34, fontFamily: 'Nunito_800ExtraBold', color: '#2B2522' },
  note: { fontSize: 14, lineHeight: 18, fontFamily: 'Nunito_600SemiBold', color: '#776C65' },
});
