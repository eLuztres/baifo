/** @jest-environment jsdom */
import { screen } from '@testing-library/react';
import CheckoutSteps from '@/components/shared/checkout-steps';
import { renderWithI18n, t } from '../utils/render-with-i18n';

const STEPS = [
  t('CHECKOUT_STEP_SIGN_IN'),
  t('CHECKOUT_STEP_SHIPPING'),
  t('CHECKOUT_STEP_PAYMENT'),
  t('CHECKOUT_STEP_PLACE_ORDER'),
];

describe('CheckoutSteps', () => {
  it('renders all four steps in order', () => {
    renderWithI18n(<CheckoutSteps />);
    const labels = screen.getAllByText(new RegExp(STEPS.join('|')));
    expect(labels.map((el) => el.textContent)).toEqual(STEPS);
  });

  it.each(STEPS.map((step, index) => [index, step]))(
    'highlights step %i (%s) when it is current',
    (index, step) => {
      renderWithI18n(<CheckoutSteps current={index as number} />);
      for (const other of STEPS) {
        const el = screen.getByText(other);
        if (other === step) expect(el).toHaveClass('bg-secondary');
        else expect(el).not.toHaveClass('bg-secondary');
      }
    }
  );

  it('draws a separator between steps but not after the last', () => {
    const { container } = renderWithI18n(<CheckoutSteps />);
    expect(container.querySelectorAll('hr')).toHaveLength(STEPS.length - 1);
  });
});
