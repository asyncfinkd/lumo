import { render, screen } from '@testing-library/react-native';
import '@/i18n';
import { BalanceCard } from '@/features/home/BalanceCard';
import { AmountsHiddenContext, maskAmount } from '../amounts';

describe('maskAmount', () => {
  it('hides the number, keeping the sign, currency and words', () => {
    expect(maskAmount('−₾64.20')).toBe('−₾••••');
    expect(maskAmount('+₾3,800.00')).toBe('+₾••••');
    expect(maskAmount('₾12,480.50')).toBe('₾••••');
    expect(maskAmount('October · ₾2,846.30 spent')).toBe('October · ₾•••• spent');
    expect(maskAmount('₾5')).toBe('₾••••');
  });
});

describe('BalanceCard with amounts hidden', () => {
  it('shows •••• and offers to show them again', async () => {
    await render(
      <AmountsHiddenContext.Provider value>
        <BalanceCard
          balanceMinor={1248050}
          change={{ since: '2026-10-01', deltaMinor: 80000 }}
          currency="GEL"
          onBalance={() => {}}
          onToggleHidden={() => {}}
        />
      </AmountsHiddenContext.Provider>,
    );
    expect(screen.getByText('••••')).toBeOnTheScreen();
    expect(screen.getByText('₾••••')).toBeOnTheScreen();
    expect(screen.queryByText('₾800')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show amounts' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Balance hidden')).toBeOnTheScreen();
  });
});
