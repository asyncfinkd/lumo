// The design's box-shadow values, used as RN `boxShadow` strings (RN 0.88 takes
// CSS syntax, including inset and negative spread).

export const shadow = {
  card: '0px 6px 20px -10px rgba(200,145,106,0.16)',
  /** The Lumo tile on the lock screen (LockScreen). */
  lockTile: 'inset 0px 0px 0px 1px rgba(255,255,255,0.9), 0px 16px 32px -16px rgba(120,70,40,0.45)',
  hero: 'inset 0px 0px 0px 1px rgba(255,255,255,0.85), 0px 12px 40px 0px rgba(200,145,106,0.12)',
  nav: 'inset 0px 0px 0px 1px rgba(255,255,255,0.85), 0px 12px 32px -10px rgba(200,145,106,0.25)',
  fab: 'inset 0px 1.5px 0px 0px rgba(255,255,255,0.45), 0px 8px 20px -4px rgba(242,132,92,0.45)',
  avatar: 'inset 0px 1px 0px 0px rgba(255,255,255,0.7), 0px 6px 14px -8px rgba(200,160,80,0.5)',
  sheet: 'inset 0px 1px 0px 0px rgba(255,255,255,0.9), 0px -12px 40px 0px rgba(200,145,106,0.14)',
  key: '0px 1px 0px 0px rgba(200,145,106,0.14), 0px 4px 12px -8px rgba(200,145,106,0.25)',
  cta: '0px 10px 24px -12px rgba(43,37,34,0.5)',
  thumb: '0px 2px 8px 0px rgba(200,145,106,0.18)',
  field: '0px 8px 24px -14px rgba(200,145,106,0.35)',
  fieldFocus: 'inset 0px 0px 0px 2px #2B2522, 0px 8px 24px -14px rgba(200,145,106,0.5)',
  search: '0px 6px 20px -12px rgba(200,145,106,0.3)',
  list: '0px 8px 24px -12px rgba(200,145,106,0.3)',
  tile: '0px 6px 18px -12px rgba(200,145,106,0.35)',
  amountFocus: 'inset 0px 0px 0px 1.5px #2B2522',
  back: '0px 6px 16px -10px rgba(200,145,106,0.4)',
  switchKnob: '0px 2px 6px 0px rgba(43,37,34,0.18)',
  // Profile (#53)
  profileAvatar: '0px 0px 0px 4px rgba(255,255,255,0.9), 0px 14px 30px -14px rgba(160,110,60,0.55)',
  avatarBadge: '0px 0px 0px 3px #FBF7F2, 0px 6px 14px -6px rgba(43,37,34,0.5)',
  photoPreview: '0px 0px 0px 4px #FFFFFF, 0px 12px 26px -12px rgba(160,110,60,0.5)',
  initialPicked: '0px 0px 0px 3px #FBF7F2, 0px 0px 0px 5px #2B2522',
  initialIdle: 'inset 0px 0px 0px 1px rgba(43,37,34,0.06)',
  appIconRing: '0px 0px 0px 1px rgba(43,37,34,0.08)',
  dialog: 'inset 0px 0px 0px 1px rgba(255,255,255,0.9), 0px 24px 60px -16px rgba(43,37,34,0.45)',
  /** A picked row in a dialog list ("Move them to"). */
  pickedRow: 'inset 0px 0px 0px 2px #2B2522',
  cropThumb: '0px 2px 8px 0px rgba(0,0,0,0.35)',
  photoToast:
    'inset 0px 0px 0px 1px rgba(255,255,255,0.9), 0px 12px 32px -10px rgba(200,145,106,0.35)',
  /** Savings: the round + and the other-jar tiles. */
  roundButton: '0px 6px 16px -10px rgba(200,145,106,0.4)',
  jarTile: '0px 6px 20px -10px rgba(200,145,106,0.2)',
  takeOut: '0px 6px 16px -10px rgba(200,145,106,0.45)',
  /** Jar colors on New jar: a white gap and an ink ring when picked. */
  toneOn: '0px 0px 0px 3px #FFFFFF, 0px 0px 0px 5px #2B2522',
  toneRing: 'inset 0px 0px 0px 2px rgba(255,255,255,0.6)',
  /** A picked amount on the add-to-jar sheet. */
  jarChip: 'inset 0px 0px 0px 1px rgba(255,255,255,0.7), 0px 6px 14px -8px rgba(160,118,28,0.5)',
  jarToast:
    'inset 0px 0px 0px 1px rgba(255,255,255,0.9), 0px 12px 32px -10px rgba(200,145,106,0.4)',
  /** The small repeat badge on automatic rows (RowTypes). */
  rowBadge: '0px 2px 6px 0px rgba(43,37,34,0.16)',
  /** The focused search field (HistorySearch): an ink ring plus a soft glow. */
  searchField: 'inset 0px 0px 0px 2px #2B2522, 0px 8px 24px -14px rgba(200,145,106,0.5)',
  /** The icon tile while Lumo opens (Splash). */
  launchTile:
    'inset 0px 0px 0px 1px rgba(255,255,255,0.9), 0px 20px 40px -18px rgba(120,70,40,0.45)',
  /** The sample notification and the main Reminders row (ProfileReminders). */
  notificationCard: '0px 10px 28px -14px rgba(43,37,34,0.3)',
  masterRow: '0px 6px 20px -10px rgba(200,145,106,0.2)',
  /** A picked option card (Export's CSV / PDF): an ink ring. */
  optionPicked: 'inset 0px 0px 0px 2px #2B2522',
  optionIdle: '0px 6px 20px -12px rgba(200,145,106,0.25)',
  /** The language list (ProfileLanguage). */
  languageCard: '0px 8px 24px -12px rgba(200,145,106,0.3)',
  /** The "Every month" total on Monthly bills. */
  billsTotal:
    'inset 0px 0px 0px 1px rgba(255,255,255,0.85), 0px 10px 30px -14px rgba(200,145,106,0.3)',
  /** A History row while it's swiped open: its right edge lifts. */
  rowOpen: '6px 0px 18px -8px rgba(43,37,34,0.18)',
  /** Budget and "no budget" cards on the details sheet. */
  detailCard: '0px 6px 18px -12px rgba(200,145,106,0.35)',
  /** The empty History illustration's tile. */
  emptyTile: '0px 10px 30px -14px rgba(200,145,106,0.4)',
  /** Selected chip: a white inner ring plus a glow in the category color. */
  chipSelected: (fg: string) =>
    `inset 0px 0px 0px 1px rgba(255,255,255,0.7), 0px 4px 12px -6px ${fg}55`,
} as const;
