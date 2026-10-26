import { useTranslation } from 'react-i18next';
import { Placeholder } from '@/components/Placeholder';

export default function InsightsScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t('insights.title')} note={t('insights.subtitle')} />;
}
