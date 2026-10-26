/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';
import { CATEGORY_ROWS } from '@/db/categories';
import { categoryColor, color } from '../color';

// WCAG relative luminance and contrast ratio for #RRGGBB colors.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('contrast (WCAG AA)', () => {
  // Normal text needs 4.5:1.
  it.each([
    ['ink on the ground', color.ink, color.bg],
    ['muted text on the ground', color.muted, color.bg],
    ['muted text on white cards', color.muted, color.white],
    ['good news on its pill', color.good, color.goodSoft],
    ['warning text on white cards', color.warning, color.white],
    ['insight text on the insight card', color.insightText, color.insight],
    ['button text on the dark button', color.cream, color.ink],
  ])('%s is at least 4.5:1', (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  // Large text (24px+) and icons need 3:1.
  it.each([
    ['currency symbols next to big numbers', color.subtle, color.bg],
    ['the active tab icon', color.accentDeep, color.accentSoft],
    ['the plus on the add button', color.ink, color.accent],
  ])('%s is at least 3:1', (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });

  it.each(Object.entries(categoryColor))('the %s icon is at least 3:1 on its tile', (_, c) => {
    expect(contrast(c.fg, c.bg)).toBeGreaterThanOrEqual(3);
  });
});

it('has colors for every category', () => {
  expect(Object.keys(categoryColor).sort()).toEqual(CATEGORY_ROWS.map((c) => c.id).sort());
});

it('keeps raw hex colors inside src/theme (illustrations aside)', () => {
  const src = path.join(__dirname, '../..');
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Illustrations are artwork with their own palette.
        if (!['theme', 'migrations', '__tests__', 'illustrations'].includes(entry.name)) walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        const content = fs.readFileSync(full, 'utf8');
        if (/#[0-9a-fA-F]{3,8}\b/.test(content)) offenders.push(path.relative(src, full));
      }
    }
  };
  walk(src);
  expect(offenders).toEqual([]);
});
