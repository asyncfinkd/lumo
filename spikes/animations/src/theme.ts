// Tokens copied from the Budget Tracker design (Home, Add sheet, Insights).
export const color = {
  bg: '#FBF7F2',
  ink: '#2B2522',
  muted: '#776C65',
  subtle: '#8A7F78',
  track: '#F2EAE2',
  donutTrack: '#F5EEE6',
  card: 'rgba(255,255,255,0.75)',
  accent: '#F2845C',
  accentSoft: '#FFE4D8',
  accentDeep: '#B9532F',
  inactive: 'rgba(43,37,34,0.5)',
  orbButter: '#FFE9B8',
  orbPeach: '#FFD8C9',
  good: '#3F7D5E',
  goodSoft: '#EEF6F0',
  calmSoft: '#F5EEE6',
  cream: '#FFF8F1',
};

export const font = {
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
};

// box-shadow values from the design, used as RN `boxShadow` strings.
export const shadow = {
  card: '0px 6px 20px -10px rgba(200,145,106,0.16)',
  hero: 'inset 0px 0px 0px 1px rgba(255,255,255,0.85), 0px 12px 40px 0px rgba(200,145,106,0.12)',
  nav: 'inset 0px 0px 0px 1px rgba(255,255,255,0.85), 0px 12px 32px -10px rgba(200,145,106,0.25)',
  fab: 'inset 0px 1.5px 0px 0px rgba(255,255,255,0.45), 0px 8px 20px -4px rgba(242,132,92,0.45)',
  avatar: 'inset 0px 1px 0px 0px rgba(255,255,255,0.7), 0px 6px 14px -8px rgba(200,160,80,0.5)',
  sheet: 'inset 0px 1px 0px 0px rgba(255,255,255,0.9), 0px -12px 40px 0px rgba(200,145,106,0.14)',
  key: '0px 1px 0px 0px rgba(200,145,106,0.14), 0px 4px 12px -8px rgba(200,145,106,0.25)',
  cta: '0px 10px 24px -12px rgba(43,37,34,0.5)',
  thumb: '0px 2px 8px 0px rgba(200,145,106,0.18)',
};

export type CategoryId = 'groceries' | 'home' | 'treats' | 'bills' | 'transport' | 'coffee';

// bg/fg: icon tiles and chips. color: donut and bars.
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
