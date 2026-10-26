import { useState } from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import '@/i18n';
import { parseAmount } from '@/domain/money';
import { categoryPalette } from '@/theme';
import { Chip } from '../Chip';
import { Numpad, pressKey } from '../Numpad';
import { SegmentedControl } from '../SegmentedControl';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('pressKey', () => {
  const type = (keys: string, start = '0') =>
    [...keys].reduce(
      (value, key) => pressKey(value, (key === '<' ? 'back' : key) as never, 'GEL'),
      start,
    );

  it('builds an amount the way the keypad types it', () => {
    expect(type('24.50')).toBe('24.50');
    expect(type('0.5')).toBe('0.5');
    expect(type('.5')).toBe('0.5');
  });

  it('replaces a lone zero', () => {
    expect(type('7')).toBe('7');
    expect(type('00')).toBe('0');
  });

  it('stops at the currency’s decimals and allows one dot', () => {
    expect(type('1.234')).toBe('1.23');
    expect(type('1..5')).toBe('1.5');
  });

  it('stops at 7 whole digits', () => {
    expect(type('123456789')).toBe('1234567');
    expect(type('1234567.89')).toBe('1234567.89');
  });

  it('deletes back to zero', () => {
    expect(type('<', '24.50')).toBe('24.5');
    expect(type('<<<<<<', '24.50')).toBe('0');
  });

  it('always produces something parseAmount accepts', () => {
    for (const keys of ['24.50', '.', '1.', '999999999', '0.05', '1..2.3']) {
      expect(parseAmount(type(keys), 'GEL')).not.toBeNull();
    }
  });
});

describe('Numpad', () => {
  function Harness() {
    const [value, setValue] = useState('0');
    return (
      <>
        <Text testID="value">{value}</Text>
        <Numpad value={value} onChange={setValue} currency="GEL" />
      </>
    );
  }

  it('types with named keys a screen reader can find', async () => {
    await render(<Harness />);
    for (const key of ['2', '4', 'Decimal point', '5', '0', 'Delete']) {
      await fireEvent.press(screen.getByRole('button', { name: key }));
    }
    expect(screen.getByTestId('value')).toHaveTextContent('24.5');
  });
});

describe('SegmentedControl', () => {
  it('is a radio group that reports the chosen option', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        accessibilityLabel="Type"
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
        value="expense"
        onChange={onChange}
      />,
    );
    // The group itself isn't focusable (its radios are), so find it by label.
    expect(screen.getByLabelText('Type')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'Expense' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Income' })).not.toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Income' }));
    expect(onChange).toHaveBeenCalledWith('income');
  });
});

describe('Chip', () => {
  it('is a radio named after its category', async () => {
    const onPress = jest.fn();
    await render(<Chip tint={categoryPalette.latte} label="Coffee" selected onPress={onPress} />);
    const chip = screen.getByRole('radio', { name: 'Coffee' });
    expect(chip).toBeChecked();
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });
});
