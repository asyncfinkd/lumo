import { useTranslation } from 'react-i18next';
import { Placeholder } from '@/components/Placeholder';

export default function BudgetsScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t('budgets.title')} note={t('placeholder.budgets')} />;
}
