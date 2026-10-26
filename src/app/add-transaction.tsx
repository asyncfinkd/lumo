import { useTranslation } from 'react-i18next';
import { Placeholder } from '@/components/Placeholder';

export default function AddTransactionScreen() {
  const { t } = useTranslation();
  return (
    <Placeholder title={t('addTransaction.newExpense')} note={t('placeholder.addTransaction')} />
  );
}
