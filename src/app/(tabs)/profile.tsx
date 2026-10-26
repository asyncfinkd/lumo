import { useTranslation } from 'react-i18next';
import { Placeholder } from '@/components/Placeholder';

export default function ProfileScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t('profile.title')} note={t('placeholder.profile')} />;
}
