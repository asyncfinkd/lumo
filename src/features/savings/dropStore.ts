import { create } from 'zustand';

/** The last drop into a jar: Savings plays the coin, the rising level and the toast once. */
export type JarDrop = {
  jarId: string;
  amountMinor: number;
  /** Money taken out: the level falls, no coin and no toast. */
  out?: boolean;
  /** The jar's percent before and after. */
  from: number;
  to: number;
  /** New for every drop, so the same jar can animate again. */
  key: number;
};

export const useJarDrop = create<{
  drop: JarDrop | null;
  show: (drop: Omit<JarDrop, 'key'>) => void;
  clear: () => void;
}>()((set) => ({
  drop: null,
  show: (drop) => set({ drop: { ...drop, key: Date.now() } }),
  clear: () => set({ drop: null }),
}));

/** The jar up front on Savings: the one tapped, or a jar just made. */
export const usePickedJar = create<{ id: string | null; pick: (id: string) => void }>()((set) => ({
  id: null,
  pick: (id) => set({ id }),
}));
