import { categoryColor } from '@/theme';
import { currencies } from '@/domain/money';
import i18n from '../index';
import en from '../en.json';

const t = i18n.t.bind(i18n);

describe('i18n', () => {
  it('starts in English', () => {
    expect(i18n.language).toBe('en');
    expect(t('home.leftToSpend')).toBe('Left to spend');
  });

  it('fills in values', () => {
    expect(t('home.greeting.evening', { name: 'Nika' })).toBe('Good evening, Nika 🌙');
    expect(t('home.ofAvailable', { amount: '₾2,650' })).toBe('of ₾2,650');
    expect(
      t('addTransaction.message.stillLeft', { amount: '₾46.90', category: 'coffee', emoji: '☕' }),
    ).toBe('Nice! Still ₾46.90 left for coffee ☕');
  });

  it('does not escape text (React already does)', () => {
    expect(t('onboarding.reveal.title', { name: 'Ana & Nika' })).toBe(
      "Ana & Nika, here's your month ✨",
    );
  });

  it('uses plurals', () => {
    expect(t('home.daysLeft', { count: 1 })).toBe('1 day left');
    expect(t('home.daysLeft', { count: 5 })).toBe('5 days left');
    expect(t('budgets.note.left', { amount: '₾87.60', count: 5 })).toBe(
      '₾87.60 left · 5 days to go',
    );
  });

  it('writes paydays as ordinals', () => {
    const payday = (count: number) => t('onboarding.income.paydayValue', { count, ordinal: true });
    expect([1, 2, 3, 4, 5, 11, 12, 13, 21, 22, 23, 31].map(payday)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '5th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '31st',
    ]);
  });

  it('names every category and currency', () => {
    expect(Object.keys(en.categories).sort()).toEqual(Object.keys(categoryColor).sort());
    expect(Object.keys(en.currencies).sort()).toEqual(Object.keys(currencies).sort());
  });

  it('has no empty strings', () => {
    const walk = (node: unknown, key: string): string[] =>
      typeof node === 'string'
        ? node.trim() === ''
          ? [key]
          : []
        : Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
            walk(v, `${key}.${k}`),
          );
    expect(walk(en, 'en')).toEqual([]);
  });
});
