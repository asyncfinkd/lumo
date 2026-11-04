import { useLocalSearchParams } from 'expo-router';
import { TransactionConfirm } from '@/features/transactions/TransactionConfirm';

// A crash here shows Try again in a sheet, not over the screen under it.
export { SheetErrorBoundary as ErrorBoundary } from '@/components/ErrorFallback';

// EditScopeAuto / EditScopeIncome: before editing a bill or salary payment.
export default function TransactionScopeScreen() {
  const { id, under } = useLocalSearchParams<{ id: string; under?: string }>();
  return <TransactionConfirm id={id} action="edit" under={Number(under ?? 0)} />;
}
