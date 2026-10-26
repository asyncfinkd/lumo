import { useTranslation } from 'react-i18next';
import { Placeholder } from '@/components/Placeholder';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t('onboarding.welcome.title')} note={t('placeholder.onboarding')} />;
}
