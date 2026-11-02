/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import ProductPrice from '@/components/shared/product/product-price';
import { displayPrice } from '../utils/fixtures';

// Currency and number format come from the shop's config, so expect formatCurrency's output
describe('ProductPrice', () => {
  it('shows the price in the shop currency', () => {
    render(<ProductPrice value={120.5} />);
    expect(screen.getByText(displayPrice(120.5))).toBeInTheDocument();
  });

  it('always shows two decimals', () => {
    render(<ProductPrice value={10} />);
    expect(screen.getByText(displayPrice(10))).toHaveTextContent(/\d[.,]00/);
  });

  it('says its label, e.g. "up to", before the price', () => {
    render(<ProductPrice value={60} label='Presupuesto hasta' />);
    expect(screen.getByText('Presupuesto hasta').parentElement).toHaveTextContent(`Presupuesto hasta${displayPrice(60)}`);
  });

  it('merges a custom className', () => {
    const { container } = render(<ProductPrice value={1} className='mt-auto' />);
    expect(container.firstChild).toHaveClass('mt-auto', 'font-semibold');
  });
});
