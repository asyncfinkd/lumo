// Spacing, radii and fixed sizes that repeat across the design.
//
// The design's CSS uses content-box sizing: a fixed height plus padding is
// taller than the height alone. These values are the real outer sizes:
// the tab bar is 68 + 2 × 6 = 80pt, segmented controls 44 + 2 × 4 = 52pt.

export const space = {
  /** Left and right edge of every screen. */
  screen: 24,
  /** Top of screen content under the status bar. */
  screenTop: 59,
  /** Room at the bottom so content clears the tab bar. */
  screenBottom: 140,
  sectionGap: 24,
  cardGap: 12,
  rowGap: 14,
} as const;

export const radius = {
  pill: 999,
  hero: 36,
  sheet: 36,
  card: 28,
  key: 20,
  tile: 16,
  tileSmall: 14,
  chip: 999,
} as const;

export const size = {
  tabBar: 80,
  tabBarInset: 24,
  tabBarBottom: 25,
  tabItem: { width: 56, height: 44 },
  fab: 56,
  segmented: 52,
  /** Smallest touch target (Definition of Done). */
  touch: 44,
  button: 56,
  key: 54,
  chip: 44,
  rowIcon: 48,
  avatar: 44,
} as const;
