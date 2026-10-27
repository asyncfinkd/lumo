import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BackupError, summarize } from './backup';
import { pickBackup, restoreFromBackup } from './files';

/**
 * "Restore from backup": choose a .lumo file, then everything on this phone is
 * replaced by it. `ask` puts the backup's name, date and size in a question
 * first; on a new install there's nothing to lose, so Welcome doesn't ask.
 */
export function useRestoreBackup(): (options: { ask: boolean }) => Promise<void> {
  const { t, i18n } = useTranslation();

  return useCallback(
    async ({ ask }) => {
      const fail = (e: unknown) =>
        Alert.alert(
          t('backup.failedTitle'),
          e instanceof BackupError && e.reason === 'newer'
            ? t('backup.newer')
            : t('backup.invalid'),
        );

      let backup;
      try {
        backup = await pickBackup();
      } catch (e) {
        fail(e);
        return;
      }
      if (!backup) return;

      const restore = async () => {
        try {
          await restoreFromBackup(backup);
          if (ask) Alert.alert(t('backup.doneTitle'), t('backup.doneBody'));
        } catch (e) {
          fail(e);
        }
      };
      if (!ask) return restore();

      const { name, exportedAt, transactions } = summarize(backup);
      const date = exportedAt
        ? new Date(exportedAt).toLocaleDateString(i18n.language, { dateStyle: 'medium' })
        : '';
      Alert.alert(
        t('backup.confirmTitle'),
        t('backup.confirmBody', { name, date, count: transactions }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('backup.restore'), style: 'destructive', onPress: restore },
        ],
      );
    },
    [t, i18n.language],
  );
}
