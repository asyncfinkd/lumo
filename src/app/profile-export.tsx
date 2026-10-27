import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenTop } from '@/components/useScreenTop';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Orbs } from '@/components/Backdrop';
import { CheckIcon, DownloadIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { useCategories } from '@/features/categories/categories';
import {
  buildCsv,
  buildHtml,
  type ExportFormat,
  type ExportRange,
  type ExportWords,
  inRange,
  rangeStart,
} from '@/features/export/export';
import {
  useAllTransactions,
  useBills,
  useBudgets,
  useIncomes,
  useProfile,
  useToday,
} from '@/features/live';
import { writeBackupFile } from '@/features/backup/files';
import { BUDGETING } from '@/features/flags';
import { SettingsHeader } from '@/features/profile/SettingsHeader';
import { color, fontFamily, radius, shadow, size, space, text } from '@/theme';

const SHARE: Record<Format, { mimeType: string; UTI: string }> = {
  csv: { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' },
  pdf: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
  backup: { mimeType: 'application/octet-stream', UTI: 'public.data' },
};

const RANGES: ExportRange[] = ['month', 'three', 'year', 'all'];
/** CSV and PDF are to read; the backup is everything, to restore in Lumo. */
type Format = ExportFormat | 'backup';
const FORMATS: Format[] = ['csv', 'pdf', 'backup'];

// ProfileExport: pick a time and CSV or PDF; Lumo makes the file on the phone
// and opens the share sheet, so you choose where it goes. The Lumo backup holds
// everything, so Restore from backup picks up exactly here.
export default function ProfileExportScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const screenTop = useScreenTop();
  const today = useToday();
  const profile = useProfile();
  const transactions = useAllTransactions();
  // Budgets aren't part of phase 1, so they're left out of the file too.
  const allBudgets = useBudgets();
  const budgets = BUDGETING ? allBudgets : [];
  const bills = useBills();
  const incomes = useIncomes();
  const categories = useCategories();
  const [range, setRange] = useState<ExportRange>('month');
  const [format, setFormat] = useState<Format>('csv');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const backup = format === 'backup';
  const chosen = useMemo(
    () => (backup ? transactions : inRange(transactions, range, today)),
    [backup, transactions, range, today],
  );
  if (!profile) return null;

  const words: ExportWords = {
    category: (id) => categories.get(id).label,
    transactions: t('exportData.transactions'),
    budgets: t('exportData.budgets'),
    billsAndIncome: t('exportData.billsAndIncome'),
    columns: t('exportData.columns', { returnObjects: true }) as ExportWords['columns'],
    kind: t('exportData.kind', { returnObjects: true }) as ExportWords['kind'],
    source: t('exportData.source', { returnObjects: true }) as ExportWords['source'],
    yes: t('exportData.yes'),
    no: t('exportData.no'),
  };

  const periodName = () => {
    const start = rangeStart(range, today);
    if (!start) return t('exportData.everything');
    const fmt = (d: string) => {
      const [y, m] = d.split('-').map(Number);
      return new Date(y!, m! - 1, 1).toLocaleDateString(i18n.language, {
        month: 'long',
        year: 'numeric',
      });
    };
    return start.slice(0, 7) === today.slice(0, 7) ? fmt(today) : `${fmt(start)} – ${fmt(today)}`;
  };

  const exportFile = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const data = { transactions: chosen, budgets, bills, incomes };
      const name = `Lumo ${today}`;
      let target: File;
      if (format === 'backup') {
        target = await writeBackupFile(`Lumo ${today}`);
      } else if (format === 'csv') {
        target = new File(Paths.cache, `${name}.csv`);
        if (target.exists) target.delete();
        await target.write(buildCsv(data, words));
      } else {
        const html = buildHtml(data, profile.currency, {
          ...words,
          title: t('exportData.fileTitle'),
          period: periodName(),
          cameIn: t('home.cameIn'),
          wentOut: t('home.wentOut'),
          byCategory: t('insights.byCategory'),
          footer: t('exportData.footer', {
            date: new Date().toLocaleDateString(i18n.language, { dateStyle: 'medium' }),
          }),
        });
        const { uri } = await Print.printToFileAsync({ html });
        target = new File(Paths.cache, `${name}.pdf`);
        if (target.exists) target.delete();
        await new File(uri).copy(target);
      }
      await Sharing.shareAsync(target.uri, {
        mimeType: SHARE[format].mimeType,
        UTI: SHARE[format].UTI,
        dialogTitle: t('exportData.title'),
      });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const included = [
    { label: t('exportData.transactions'), count: chosen.length },
    ...(BUDGETING ? [{ label: t('exportData.budgets'), count: budgets.length }] : []),
    { label: t('exportData.billsAndIncome'), count: bills.length + incomes.length },
    ...(backup ? [{ label: t('exportData.categories'), count: categories.list.length }] : []),
  ];
  const formatName = t(`exportData.${format}`);

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <Orbs />
      <SettingsHeader title={t('exportData.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={styles.heading}>
          {t('exportData.heading')}
        </Text>
        <Text style={styles.hint}>{t('exportData.hint')}</Text>

        {backup ? null : (
          <>
            <Text accessibilityRole="header" style={styles.section}>
              {t('exportData.time')}
            </Text>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              {RANGES.map((r) => {
                const on = r === range;
                return (
                  <Press
                    key={r}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setRange(r)}
                    style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                  >
                    <Text style={[styles.chipText, on && { color: color.white }]}>
                      {t(`exportData.ranges.${r}`)}
                    </Text>
                  </Press>
                );
              })}
            </View>
          </>
        )}

        <Text accessibilityRole="header" style={[styles.section, styles.sectionGap]}>
          {t('exportData.format')}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.formats}>
          {FORMATS.map((f) => {
            const on = f === format;
            return (
              <Press
                key={f}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setFormat(f)}
                style={[
                  styles.format,
                  f === 'backup' && styles.formatWide,
                  on ? styles.formatOn : styles.formatOff,
                ]}
              >
                <Text style={styles.formatName}>{t(`exportData.${f}`)}</Text>
                <Text style={styles.formatHint}>{t(`exportData.${f}Hint`)}</Text>
              </Press>
            );
          })}
        </View>

        <View style={styles.included}>
          {included.map((i) => (
            <View key={i.label} style={styles.includedRow}>
              <View style={styles.tick}>
                <CheckIcon color={color.good} />
              </View>
              <Text style={styles.includedLabel}>{i.label}</Text>
              <Text style={styles.includedCount}>{i.count}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
        <Text accessibilityLiveRegion="polite" style={[styles.made, failed && styles.failed]}>
          {failed ? t('exportData.failed') : t('exportData.madeHere')}
        </Text>
        <Press
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          haptic
          onPress={exportFile}
          style={[styles.cta, busy && styles.ctaBusy]}
        >
          <DownloadIcon color={color.white} />
          <Text style={styles.ctaText}>{t('exportData.cta', { format: formatName })}</Text>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { paddingTop: 24, paddingHorizontal: space.screen },
  heading: {
    fontFamily: fontFamily.extrabold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: color.ink,
  },
  hint: { ...text.subtitle, fontSize: 15, lineHeight: 21, marginTop: 6, color: color.muted },
  section: {
    ...text.meta,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.muted,
  },
  sectionGap: { marginTop: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center' },
  chipOn: { backgroundColor: color.ink },
  chipOff: { backgroundColor: color.listCard },
  chipText: { fontFamily: fontFamily.bold, fontSize: 14, color: color.ink },
  formats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  format: {
    flexGrow: 1,
    flexBasis: '40%',
    padding: 14,
    borderRadius: 22,
    borderCurve: 'continuous',
    gap: 4,
  },
  formatWide: { flexBasis: '100%' },
  formatOn: { backgroundColor: color.white, boxShadow: shadow.optionPicked },
  formatOff: { backgroundColor: color.optionIdle, boxShadow: shadow.optionIdle },
  formatName: { fontFamily: fontFamily.extrabold, fontSize: 16, color: color.ink },
  formatHint: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 16, color: color.muted },
  included: {
    marginTop: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  includedRow: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.cameInTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  includedLabel: { ...text.label, flex: 1, color: color.ink },
  includedCount: { fontFamily: fontFamily.semibold, fontSize: 13, color: color.muted },
  bottom: {
    position: 'absolute',
    left: space.screen,
    right: space.screen,
    bottom: 0,
    gap: 14,
  },
  made: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    textAlign: 'center',
    color: color.subtle,
  },
  failed: { color: color.danger },
  cta: {
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    boxShadow: shadow.cta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaBusy: { opacity: 0.6 },
  ctaText: { fontFamily: fontFamily.bold, fontSize: 17, color: color.white },
});
