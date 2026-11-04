import { useLocalSearchParams } from 'expo-router';
import { TransactionConfirm } from '@/features/transactions/TransactionConfirm';

// A crash here shows Try again in a sheet, not over the screen under it.
export { SheetErrorBoundary as ErrorBoundary } from '@/components/ErrorFallback';

// DeleteConfirm (and its auto bill, salary and adjustment looks).
export default function TransactionDeleteScreen() {
  const { id, close } = useLocalSearchParams<{ id: string; close?: string }>();
  return <TransactionConfirm id={id} action="delete" close={Number(close ?? 1)} />;
}
