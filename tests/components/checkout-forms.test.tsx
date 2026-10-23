/** @jest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShippingAddressForm from '@/app/(root)/shipping-address/shipping-address-form';
import PaymentMethodForm from '@/app/(root)/payment-method/payment-method-form';
import PlaceOrderForm from '@/app/(root)/place-order/place-order-form';
import { updateUserAddress, updateUserPaymentMethod } from '@/lib/actions/user.actions';
import { createOrder } from '@/lib/actions/order.actions';
import { toast } from '@/hooks/use-toast';
import { shippingAddressDefaultValues } from '@/lib/constants';
import { paymentMethodLabel } from '@/lib/utils';
import { renderWithI18n as render, t } from '@/tests/utils/render-with-i18n';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/actions/user.actions', () => ({
  updateUserAddress: jest.fn(),
  updateUserPaymentMethod: jest.fn(),
}));
jest.mock('@/lib/actions/order.actions', () => ({ createOrder: jest.fn() }));
jest.mock('@/hooks/use-toast', () => {
  const toast = jest.fn();
  return { toast, useToast: () => ({ toast }) };
});

const mockToast = toast as jest.Mock;

const ADDRESS = {
  fullName: 'Ana Pérez',
  streetAddress: 'Calle Mayor 1',
  city: 'Las Palmas',
  postalCode: '35001',
  country: 'Spain',
};

describe('ShippingAddressForm', () => {
  const mockUpdate = updateUserAddress as jest.Mock;

  it('shows validation errors and does not submit an empty address', async () => {
    render(<ShippingAddressForm address={shippingAddressDefaultValues} />);

    await userEvent.click(screen.getByRole('button', { name: t('CHECKOUT_CONTINUE') }));

    expect(await screen.findByText(t('VALIDATION_NAME_MIN'))).toBeInTheDocument();
    expect(screen.getByText(t('VALIDATION_CITY_MIN'))).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('saves the address and goes to the payment step', async () => {
    mockUpdate.mockResolvedValue({ success: true, message: 'ok' });
    render(<ShippingAddressForm address={shippingAddressDefaultValues} />);

    await userEvent.type(screen.getByLabelText(t('CHECKOUT_FULL_NAME')), ADDRESS.fullName);
    await userEvent.type(screen.getByLabelText(t('CHECKOUT_STREET')), ADDRESS.streetAddress);
    await userEvent.type(screen.getByLabelText(t('CHECKOUT_CITY')), ADDRESS.city);
    await userEvent.type(screen.getByLabelText(t('CHECKOUT_POSTAL_CODE')), ADDRESS.postalCode);
    await userEvent.type(screen.getByLabelText(t('CHECKOUT_COUNTRY')), ADDRESS.country);
    await userEvent.click(screen.getByRole('button', { name: t('CHECKOUT_CONTINUE') }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/payment-method'));
    expect(mockUpdate).toHaveBeenCalledWith(ADDRESS);
  });

  it('prefills a saved address', () => {
    render(<ShippingAddressForm address={ADDRESS} />);
    expect(screen.getByLabelText(t('CHECKOUT_CITY'))).toHaveValue('Las Palmas');
  });

  it('stays on the page and toasts when saving fails', async () => {
    mockUpdate.mockResolvedValue({ success: false, message: 'User not found' });
    render(<ShippingAddressForm address={ADDRESS} />);

    await userEvent.click(screen.getByRole('button', { name: t('CHECKOUT_CONTINUE') }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({ variant: 'destructive', description: 'User not found' })
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('PaymentMethodForm', () => {
  const mockUpdate = updateUserPaymentMethod as jest.Mock;
  // The server page passes these from the shop's PAYMENT_METHODS config
  const PAYMENT_PROPS = {
    paymentMethods: ['PayPal', 'Stripe', 'CashOnDelivery'],
    defaultPaymentMethod: 'PayPal',
  };

  it('offers only the configured payment methods', () => {
    render(
      <PaymentMethodForm paymentMethods={['Stripe']} defaultPaymentMethod='Stripe' preferredPaymentMethod={null} />
    );
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: paymentMethodLabel(t, 'Stripe') })).toBeInTheDocument();
  });

  it('selects the preferred method, or the default one', () => {
    const { unmount } = render(<PaymentMethodForm {...PAYMENT_PROPS} preferredPaymentMethod={null} />);
    expect(screen.getByRole('radio', { name: paymentMethodLabel(t, 'PayPal') })).toBeChecked();
    unmount();

    render(<PaymentMethodForm {...PAYMENT_PROPS} preferredPaymentMethod='Stripe' />);
    expect(screen.getByRole('radio', { name: paymentMethodLabel(t, 'Stripe') })).toBeChecked();
    expect(screen.getByRole('radio', { name: paymentMethodLabel(t, 'PayPal') })).not.toBeChecked();
  });

  it('saves the chosen method and goes to place order', async () => {
    mockUpdate.mockResolvedValue({ success: true, message: 'ok' });
    render(<PaymentMethodForm {...PAYMENT_PROPS} preferredPaymentMethod={null} />);

    await userEvent.click(screen.getByRole('radio', { name: paymentMethodLabel(t, 'CashOnDelivery') }));
    await userEvent.click(screen.getByRole('button', { name: t('CHECKOUT_CONTINUE') }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/place-order'));
    expect(mockUpdate).toHaveBeenCalledWith({ type: 'CashOnDelivery' });
  });

  it('toasts and stays when saving fails', async () => {
    mockUpdate.mockResolvedValue({ success: false, message: 'Invalid payment method' });
    render(<PaymentMethodForm {...PAYMENT_PROPS} preferredPaymentMethod='PayPal' />);

    await userEvent.click(screen.getByRole('button', { name: t('CHECKOUT_CONTINUE') }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        description: 'Invalid payment method',
      })
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('PlaceOrderForm', () => {
  const mockCreate = createOrder as jest.Mock;

  it('creates the order and follows the returned redirect', async () => {
    mockCreate.mockResolvedValue({ success: true, message: 'Order created', redirectTo: '/order/o-1' });
    render(<PlaceOrderForm />);

    await userEvent.click(screen.getByRole('button', { name: t('CHECKOUT_PLACE_ORDER') }));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/order/o-1'));
  });

  it('sends the user back to fix a missing step', async () => {
    mockCreate.mockResolvedValue({ success: false, message: 'No shipping address', redirectTo: '/shipping-address' });
    render(<PlaceOrderForm />);

    await userEvent.click(screen.getByRole('button', { name: t('CHECKOUT_PLACE_ORDER') }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/shipping-address'));
  });

  it('does not navigate when there is no redirect', async () => {
    mockCreate.mockResolvedValue({ success: false, message: 'Order not created' });
    render(<PlaceOrderForm />);

    await userEvent.click(screen.getByRole('button', { name: t('CHECKOUT_PLACE_ORDER') }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({ variant: 'destructive', description: 'Order not created' })
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
