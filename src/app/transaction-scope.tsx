import { useLocalSearchParams } from 'expo-router';
import { TransactionConfirm } from '@/features/transactions/TransactionConfirm';

// EditScopeAuto / EditScopeIncome: before editing a bill or salary payment.
export default function TransactionScopeScreen() {
  const { id, under } = useLocalSearchParams<{ id: string; under?: string }>();
  return <TransactionConfirm id={id} action="edit" under={Number(under ?? 0)} />;
}
