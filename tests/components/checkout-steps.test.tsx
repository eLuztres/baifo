/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import CheckoutSteps from '@/components/shared/checkout-steps';

const STEPS = ['User Login', 'Shipping Address', 'Payment Method', 'Place Order'];

describe('CheckoutSteps', () => {
  it('renders all four steps in order', () => {
    render(<CheckoutSteps />);
    const labels = screen.getAllByText(new RegExp(STEPS.join('|')));
    expect(labels.map((el) => el.textContent)).toEqual(STEPS);
  });

  it.each(STEPS.map((step, index) => [index, step]))(
    'highlights step %i (%s) when it is current',
    (index, step) => {
      render(<CheckoutSteps current={index as number} />);
      for (const other of STEPS) {
        const el = screen.getByText(other);
        if (other === step) expect(el).toHaveClass('bg-secondary');
        else expect(el).not.toHaveClass('bg-secondary');
      }
    }
  );

  it('draws a separator between steps but not after the last', () => {
    const { container } = render(<CheckoutSteps />);
    expect(container.querySelectorAll('hr')).toHaveLength(STEPS.length - 1);
  });
});
