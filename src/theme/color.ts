// Every color in the app, from the Budget Tracker design. Nothing outside
// src/theme may use a raw hex value (checked by a test).

import type { CategoryId } from '@/db/categories';

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

type CategoryColors = {
  /** Icon tile and unselected chip dot. */
  bg: string;
  /** Selected chip. */
  selected: string;
  /** Icon and dot. */
  fg: string;
  /** Donut segment and bar (expense categories). */
  chart: string;
};

export const categoryColor: Record<CategoryId, CategoryColors> = {
  coffee: { bg: '#F3E6DA', selected: '#EBD5C1', fg: '#946649', chart: '#CDA98C' },
  groceries: { bg: '#FFF0C7', selected: '#FFE39A', fg: '#A0761C', chart: '#F5C86A' },
  transport: { bg: '#DCEBF8', selected: '#C7DDF3', fg: '#4A7EAD', chart: '#94BDE6' },
  treats: { bg: '#FBDDE3', selected: '#F6C8D3', fg: '#B9566E', chart: '#EFA3B6' },
  bills: { bg: '#DDEEE3', selected: '#C8E4D2', fg: '#4E8A6A', chart: '#8FC4A6' },
  home: { bg: '#ECE6F7', selected: '#DDD3F1', fg: '#7A62A8', chart: '#B7A6E0' },
  salary: { bg: '#DDEEE3', selected: '#C8E4D2', fg: '#4E8A6A', chart: '#8FC4A6' },
  freelance: { bg: '#DCEBF8', selected: '#C7DDF3', fg: '#4A7EAD', chart: '#94BDE6' },
  gift: { bg: '#FBDDE3', selected: '#F6C8D3', fg: '#B9566E', chart: '#EFA3B6' },
  refund: { bg: '#FFF0C7', selected: '#FFE39A', fg: '#A0761C', chart: '#F5C86A' },
};
