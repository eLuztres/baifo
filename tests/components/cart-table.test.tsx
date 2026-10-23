/** @jest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CartTable from '@/app/(root)/cart/cart-table';
import { addItemToCart, removeItemFromCart } from '@/lib/actions/cart.actions';
import { toast } from '@/hooks/use-toast';
import { renderWithI18n, t } from '../utils/render-with-i18n';
import { CART, CART_ITEM, displayPrice } from '../utils/fixtures';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/actions/cart.actions', () => ({
  addItemToCart: jest.fn(),
  removeItemFromCart: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => {
  const toast = jest.fn();
  return { toast, useToast: () => ({ toast }) };
});
jest.mock('@/components/ProductMedia', () => ({
  __esModule: true,
  default: ({ alt }: { alt?: string }) => <img alt={alt} />,
}));

const mockAdd = addItemToCart as jest.Mock;
const mockRemove = removeItemFromCart as jest.Mock;
const mockToast = toast as jest.Mock;

describe('CartTable', () => {
  it.each([
    ['no cart', undefined],
    ['an empty cart', { ...CART, items: [] }],
  ])('shows the empty state for %s', (_, cart) => {
    renderWithI18n(<CartTable cart={cart} />);

    expect(screen.getByText(t('CART_EMPTY_TITLE'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('CART_EMPTY_CTA') })).toHaveAttribute('href', '/#showroom');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('lists each item with its quantity, price and product link', () => {
    renderWithI18n(<CartTable cart={CART} />);

    expect(screen.getByRole('link', { name: /volcanic lamp/i })).toHaveAttribute(
      'href',
      '/product/volcanic-lamp'
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(displayPrice(CART_ITEM.price))).toBeInTheDocument();
  });

  it('shows the item count and subtotal', () => {
    renderWithI18n(<CartTable cart={CART} />);

    expect(screen.getByText(t('CART_SUBTOTAL', { count: 2 }))).toBeInTheDocument();
    expect(screen.getByText(displayPrice(CART.itemsPrice))).toBeInTheDocument();
  });

  it('adds and removes one unit per click', async () => {
    mockAdd.mockResolvedValue({ success: true, message: 'ok' });
    mockRemove.mockResolvedValue({ success: true, message: 'ok' });
    renderWithI18n(<CartTable cart={CART} />);

    await userEvent.click(screen.getByRole('button', { name: t('ADD_ONE') }));
    await userEvent.click(screen.getByRole('button', { name: t('REMOVE_ONE') }));

    expect(mockAdd).toHaveBeenCalledWith({ productId: CART_ITEM.productId });
    expect(mockRemove).toHaveBeenCalledWith(CART_ITEM.productId);
  });

  // The server already translates its messages
  it('shows the server message as an error toast when stock runs out', async () => {
    mockAdd.mockResolvedValue({ success: false, message: t('TOAST_NO_STOCK') });
    renderWithI18n(<CartTable cart={CART} />);

    await userEvent.click(screen.getByRole('button', { name: t('ADD_ONE') }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        description: t('TOAST_NO_STOCK'),
      })
    );
  });

  it('goes to the shipping step on checkout', async () => {
    renderWithI18n(<CartTable cart={CART} />);

    await userEvent.click(screen.getByRole('button', { name: new RegExp(t('CART_CHECKOUT')) }));

    expect(mockPush).toHaveBeenCalledWith('/shipping-address');
  });
});
