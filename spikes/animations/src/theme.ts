// Tokens copied from the Budget Tracker design (Home, Add sheet, Insights).
export const color = {
  bg: '#FBF7F2',
  ink: '#2B2522',
  muted: '#776C65',
  subtle: '#8A7F78',
  track: '#F2EAE2',
  card: 'rgba(255,255,255,0.75)',
  accent: '#F2845C',
  accentSoft: '#FFE4D8',
  accentDeep: '#B9532F',
  orbButter: '#FFE9B8',
  orbPeach: '#FFD8C9',
  good: '#3F7D5E',
  goodSoft: '#EEF6F0',
};

export const font = {
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
};

// Spring from the design's cubic-bezier(.34,1.56,.64,1) "press" feel.
export const springs = {
  press: { damping: 14, stiffness: 320, mass: 0.6 },
  sheet: { damping: 22, stiffness: 220, mass: 0.9 },
  digit: { damping: 15, stiffness: 120, mass: 0.9 },
  thumb: { damping: 18, stiffness: 260 },
};

export type CategoryId = 'groceries' | 'home' | 'treats' | 'bills' | 'transport' | 'coffee';

export const categories: Record<CategoryId, { name: string; color: string; bg: string; fg: string }> = {
  home: { name: 'Home', color: '#B7A6E0', bg: '#ECE6F7', fg: '#7A62A8' },
  groceries: { name: 'Groceries', color: '#F5C86A', bg: '#FFF0C7', fg: '#A0761C' },
  transport: { name: 'Getting around', color: '#94BDE6', bg: '#DCEBF8', fg: '#4A7EAD' },
  coffee: { name: 'Coffee', color: '#CDA98C', bg: '#F3E6DA', fg: '#946649' },
  treats: { name: 'Treats', color: '#EFA3B6', bg: '#FBDDE3', fg: '#B9566E' },
  bills: { name: 'Bills', color: '#8FC4A6', bg: '#DDEEE3', fg: '#4E8A6A' },
};

// docs/sample-data.md, amounts in tetri (ADR 0003).
export const sample = {
  leftToSpendMinor: 79970,
  availableMinor: 265000,
  balanceMinor: 1248050,
  month: [
    ['groceries', 81240],
    ['home', 80000],
    ['treats', 50330],
    ['bills', 35000],
    ['transport', 28600],
    ['coffee', 24860],
  ] as [CategoryId, number][],
  week: [
    ['groceries', 18420],
    ['treats', 16965],
    ['coffee', 9640],
    ['bills', 7000],
    ['transport', 7000],
  ] as [CategoryId, number][],
};
