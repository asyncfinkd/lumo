import { CATEGORY_ROWS } from '@/db/categories';
import { currencies } from '@/domain/money';
import i18n from '../index';
import en from '../en.json';
import ka from '../ka.json';

const t = i18n.t.bind(i18n);

describe('i18n', () => {
  it('starts in English', () => {
    expect(i18n.language).toBe('en');
    expect(t('home.yourBalance')).toBe('Your balance');
  });

  it('fills in values', () => {
    expect(t('home.greeting.evening', { name: 'Nika' })).toBe('Good evening, Nika 🌙');
    expect(t('home.moreThan', { date: 'Oct 1' })).toBe('more than on Oct 1');
    expect(t('addTransaction.message.incomeTo', { name: 'Cash' })).toBe(
      'Lovely! That goes to Cash 🌿',
    );
  });

  it('does not escape text (React already does)', () => {
    expect(t('home.greeting.evening', { name: 'Ana & Nika' })).toBe('Good evening, Ana & Nika 🌙');
  });

  it('uses plurals', () => {
    expect(t('home.inAccounts', { count: 1 })).toBe('In 1 account');
    expect(t('home.inAccounts', { count: 3 })).toBe('In 3 accounts');
    expect(t('language.previewLeft', { amount: '₾87.60', count: 5 })).toBe(
      '₾87.60 left to spend · 5 days to go',
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
    expect(Object.keys(en.categories).sort()).toEqual(
      [...CATEGORY_ROWS.map((c) => c.id), 'none'].sort(),
    );
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

  describe('Georgian', () => {
    const tka = i18n.getFixedT('ka');
    /** Every key, with plural and ordinal endings stripped. */
    const keys = (node: object, prefix = ''): string[] =>
      Object.entries(node).flatMap(([k, v]) =>
        typeof v === 'string'
          ? [`${prefix}${k}`.replace(/_(ordinal_)?(zero|one|two|few|many|other)$/, '')]
          : keys(v as object, `${prefix}${k}.`),
      );

    it('has every English string, and nothing extra', () => {
      expect([...new Set(keys(ka))].sort()).toEqual([...new Set(keys(en))].sort());
    });

    it('has no empty strings', () => {
      const walk = (node: unknown, key: string): string[] =>
        typeof node === 'string'
          ? node.trim() === '' && !key.endsWith('noBudgetAfter')
            ? [key]
            : []
          : Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
              walk(v, `${key}.${k}`),
            );
      expect(walk(ka, 'ka')).toEqual([]);
    });

    it('fills in values, plurals and paydays', () => {
      expect(tka('home.greeting.evening', { name: 'ნიკა' })).toBe('საღამო მშვიდობისა, ნიკა 🌙');
      expect(tka('home.inAccounts', { count: 1 })).toBe('1 ანგარიშზე');
      expect(tka('home.inAccounts', { count: 5 })).toBe('5 ანგარიშზე');
      const due = (day: number) =>
        tka('billsManage.due', {
          day: tka('onboarding.income.paydayValue', { count: day, ordinal: true }),
        });
      expect([1, 2, 15, 21, 31].map(due)).toEqual([
        'ყოველი თვის 1 რიცხვში',
        'ყოველი თვის 2 რიცხვში',
        'ყოველი თვის 15 რიცხვში',
        'ყოველი თვის 21 რიცხვში',
        'ყოველი თვის 31 რიცხვში',
      ]);
    });
  });
});
