import { randomUUID } from 'expo-crypto';

/** UUID v4 for every row (ADR 0003), so a future import can merge without clashes. */
export function newId(): string {
  return randomUUID();
}
