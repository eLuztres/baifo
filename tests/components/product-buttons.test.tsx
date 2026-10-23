/** @jest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddToCartButton from '@/components/shared/product/addToCartButton';
import BuyNowButton from '@/components/shared/product/buyNowButton';
import { addItemToCart } from '@/lib/actions/cart.actions';
import { renderWithI18n, t } from '../utils/render-with-i18n';
import { PRODUCT } from '../utils/fixtures';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/lib/actions/cart.actions', () => ({
  addItemToCart: jest.fn(),
  removeItemFromCart: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => {
  const toast = jest.fn();
  return { toast, useToast: () => ({ toast }) };
});

const mockAdd = addItemToCart as jest.Mock;
const SOLD_OUT_PRODUCT = { ...PRODUCT, stock: 0 };

beforeEach(() => mockAdd.mockResolvedValue({ success: true, message: 'ok' }));

describe('AddToCartButton', () => {
  it('sends only the product id, the server builds the cart item', async () => {
    renderWithI18n(<AddToCartButton product={PRODUCT} />);

    await userEvent.click(screen.getByRole('button', { name: t('ADD_TO_CART') }));

    expect(mockAdd).toHaveBeenCalledWith({ productId: PRODUCT.id });
  });

  it('shows a disabled "Sold out" button when out of stock', () => {
    renderWithI18n(<AddToCartButton product={SOLD_OUT_PRODUCT} />);

    expect(screen.getByRole('button', { name: t('SOLD_OUT') })).toBeDisabled();
    expect(screen.queryByRole('button', { name: t('ADD_TO_CART') })).not.toBeInTheDocument();
  });
});

describe('BuyNowButton', () => {
  it('adds the product then goes to the shipping step', async () => {
    renderWithI18n(<BuyNowButton product={PRODUCT} />);

    await userEvent.click(screen.getByRole('button', { name: t('BUY_NOW') }));

    expect(mockAdd).toHaveBeenCalledWith({ productId: PRODUCT.id });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/shipping-address'));
  });

  it('shows a disabled "Sold out" button when out of stock', () => {
    renderWithI18n(<BuyNowButton product={SOLD_OUT_PRODUCT} />);
    expect(screen.getByRole('button', { name: t('SOLD_OUT') })).toBeDisabled();
  });
});
