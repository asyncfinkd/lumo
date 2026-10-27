// Every color in the app, from the Budget Tracker design. Nothing outside
// src/theme may use a raw hex value (checked by a test).

import type { CategoryColorKey } from '@/db/categories';
import type { CurrencyCode } from '@/domain/money';
import type { BillKey } from '@/features/onboarding/bills';

export const color = {
  // Ground and text
  bg: '#FBF7F2',
  ink: '#2B2522',
  muted: '#776C65',
  /** Currency symbols and the fraction next to big numbers (large text only). */
  subtle: '#8A7F78',
  white: '#FFFFFF',
  /** Text on dark buttons. */
  cream: '#FFF8F1',

  // Surfaces
  card: 'rgba(255,255,255,0.75)',
  heroCard: 'rgba(255,255,255,0.7)',
  glass: 'rgba(255,255,255,0.72)',
  sheet: 'rgba(255,252,248,0.9)',
  key: 'rgba(255,255,255,0.95)',
  /** Quiet buttons and unselected chips. */
  wash: 'rgba(43,37,34,0.05)',
  /** EditBudget's nudge row: a shade lighter than wash. */
  washSoft: 'rgba(43,37,34,0.04)',
  /** The dot inside a selected chip. */
  chipDot: 'rgba(255,255,255,0.75)',
  scrim: 'rgba(43,37,34,0.22)',
  track: '#F2EAE2',
  donutTrack: '#F5EEE6',
  grabber: '#E2D8CF',
  avatar: '#FFE7A6',

  // Accent: the main action, the active tab, budget progress
  accent: '#F2845C',
  accentSoft: '#FFE4D8',
  accentDeep: '#B9532F',
  inactive: 'rgba(43,37,34,0.5)',

  // Feedback
  /** The design's #3F7D5E was 4.43:1 on goodSoft; one step darker passes AA. */
  good: '#3E7B5C',
  goodSoft: '#EEF6F0',
  calmSoft: '#F5EEE6',
  warning: '#A4513A',
  warningFill: '#E2775A',

  // Inputs and onboarding
  field: 'rgba(255,255,255,0.85)',
  placeholder: '#A0958D',
  progressTrack: 'rgba(43,37,34,0.07)',
  radioRing: '#DDD2C8',
  /** An empty radio dot in a dialog (ProfileCategoryDelete). */
  radioRingSoft: '#D9CEC5',
  selectedRow: 'rgba(255,240,199,0.75)',
  listCard: 'rgba(255,255,255,0.8)',
  /** Unselected bill tile. */
  tileOff: 'rgba(255,255,255,0.8)',

  // Profile photo
  toast: 'rgba(255,255,255,0.92)',
  /** ProfilePhotoCrop's dark ground and its soft text. */
  cropBg: '#1E1A18',
  cropHint: 'rgba(255,248,241,0.72)',
  cropTrack: 'rgba(255,255,255,0.22)',
  /** Destructive tile and text (Remove photo, Delete). */
  dangerSoft: '#FBE7DF',
  danger: '#A4402B',
  /** The solid destructive button ("Delete everything"). */
  dangerStrong: '#B5452F',
  /** Behind a confirm dialog: darker than a sheet's scrim. */
  dim: 'rgba(43,37,34,0.34)',
  dialog: 'rgba(255,252,248,0.97)',
  /** Secondary text one step darker than muted (labels in dialogs). */
  softInk: '#5E554F',
  /** Second line on a dark button ("This and future ones"). */
  onDarkHint: 'rgba(255,255,255,0.85)',
  /** An option card that isn't picked (Export's CSV / PDF). */
  optionIdle: 'rgba(255,255,255,0.6)',
  /** The "Every 24th" day button on the bill sheet. */
  dueChip: '#EDE4DB',
  /** A History row while it's swiped open. */
  rowOpen: '#FFFDFB',
  /** "Balance adjusted" rows: a neutral grey tile (RowTypes). */
  adjustTile: '#EFEAE4',
  /** A disabled solid button (Save without a name). */
  disabled: '#BDB3AC',
  /** A disabled destructive button and similar quiet fills. */
  washStrong: 'rgba(43,37,34,0.06)',
  // Switch
  switchOn: '#6BAF8D',
  switchOff: '#E2D8CF',

  // Insight card
  insight: '#FFF4DA',
  insightText: '#5E4714',
  insightIcon: '#A0761C',

  // Came in / went out
  cameInTile: '#DDEEE3',
  cameInIcon: '#4E8A6A',
  cameInLine: '#6BAF8D',
  wentOutTile: '#F2E9E2',
  wentOutIcon: '#8C6F5E',
  wentOutLine: '#B89C8A',

  // Background light
  orbButter: '#FFE9B8',
  orbPeach: '#FFD8C9',
} as const;

/** CSS gradients for RN `backgroundImage`. */
export const gradient = {
  progress: 'linear-gradient(90deg, #F7A27F, #F2845C)',
  budgetCalm: 'linear-gradient(90deg, #F9B596, #F59C78)',
  heroGlow: 'linear-gradient(150deg, rgba(255,241,204,0.45) 0%, rgba(255,255,255,0) 70%)',
  bottomFade:
    'linear-gradient(180deg, rgba(251,247,242,0) 0%, rgba(251,247,242,0.8) 45%, #FBF7F2 100%)',
} as const;

/** Currency tiles in onboarding: symbol color on a soft tile. */
export const currencyColor: Record<CurrencyCode, { bg: string; fg: string }> = {
  GEL: { bg: '#FFF0C7', fg: '#A0761C' },
  USD: { bg: '#DDEEE3', fg: '#4E8A6A' },
  EUR: { bg: '#DCEBF8', fg: '#4A7EAD' },
  GBP: { bg: '#ECE6F7', fg: '#7A62A8' },
  TRY: { bg: '#FBDDE3', fg: '#B9566E' },
  AMD: { bg: '#F3E6DA', fg: '#946649' },
  AZN: { bg: '#DDEEE3', fg: '#4E8A6A' },
  UAH: { bg: '#FFF0C7', fg: '#A0761C' },
};

type CategoryColors = {
  /** Icon tile and unselected chip dot. */
  bg: string;
  /** Selected chip. */
  selected: string;
  /** Icon and dot. */
  fg: string;
  /** Donut segment and bar. */
  chart: string;
  /** Text on the soft tile color (the category chip in TransactionDetail). */
  chip: string;
};

/**
 * The eight category colors (ProfileCategoryEdit). `selected` and `chart` for
 * coral and mint follow the same steps as the others; no board shows them yet.
 */
export const categoryPalette: Record<CategoryColorKey, CategoryColors> = {
  butter: { bg: '#FFF0C7', selected: '#FFE39A', fg: '#A0761C', chart: '#F5C86A', chip: '#6E5210' },
  latte: { bg: '#F3E6DA', selected: '#EBD5C1', fg: '#946649', chart: '#CDA98C', chip: '#6E4A33' },
  sky: { bg: '#DCEBF8', selected: '#C7DDF3', fg: '#4A7EAD', chart: '#94BDE6', chip: '#2F5A84' },
  blush: { bg: '#FBDDE3', selected: '#F6C8D3', fg: '#B9566E', chart: '#EFA3B6', chip: '#8A3A50' },
  sage: { bg: '#DDEEE3', selected: '#C8E4D2', fg: '#4E8A6A', chart: '#8FC4A6', chip: '#355F49' },
  lilac: { bg: '#ECE6F7', selected: '#DDD3F1', fg: '#7A62A8', chart: '#B7A6E0', chip: '#57437F' },
  coral: { bg: '#FCE3DA', selected: '#F8CDBE', fg: '#B5593F', chart: '#EBA38C', chip: '#8A3F2C' },
  mint: { bg: '#D6F0E4', selected: '#BFE6D3', fg: '#3F7D5E', chart: '#86C7A6', chip: '#2F6B52' },
};

/** "No category" (after its category was deleted): a quiet grey. */
export const noCategoryColors: CategoryColors = {
  bg: '#EFE9E3',
  selected: '#E4DBD2',
  fg: '#8A7F78',
  chart: '#CFC5BC',
  chip: '#5E554F',
};

/** ProfilePhotoSheet's colors for the initial when there's no photo. */
export const avatarColor = {
  butter: '#FFE7A6',
  peach: '#FFD9C7',
  blush: '#F8D3DD',
  lilac: '#E2D9F4',
  sky: '#D3E5F6',
  sage: '#D3EADB',
} as const;

export type AvatarColor = keyof typeof avatarColor;

/** Bill tiles in onboarding: soft tile, selected tile, icon color. */
export const billColor: Record<BillKey, { bg: string; selected: string; fg: string }> = {
  rent: { bg: '#ECE6F7', selected: '#DDD3F1', fg: '#7A62A8' },
  utilities: { bg: '#FFF0C7', selected: '#FFE39A', fg: '#A0761C' },
  internet: { bg: '#DCEBF8', selected: '#C7DDF3', fg: '#4A7EAD' },
  phone: { bg: '#FBDDE3', selected: '#F6C8D3', fg: '#B9566E' },
  gym: { bg: '#DDEEE3', selected: '#C8E4D2', fg: '#4E8A6A' },
  insurance: { bg: '#F3E6DA', selected: '#EBD5C1', fg: '#946649' },
  netflix: { bg: '#FBDDE3', selected: '#F6C8D3', fg: '#B9566E' },
  spotify: { bg: '#DDEEE3', selected: '#C8E4D2', fg: '#4E8A6A' },
  other: { bg: '#F2EAE2', selected: '#E8DDD2', fg: '#776C65' },
};
