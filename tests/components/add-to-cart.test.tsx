/** @jest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddToCart from '@/components/shared/product/add-to-cart';
import { addItemToCart, removeItemFromCart } from '@/lib/actions/cart.actions';
import { toast } from '@/hooks/use-toast';
import { renderWithI18n, t } from '../utils/render-with-i18n';
import { CART, CART_ITEM } from '../utils/fixtures';

jest.mock('@/lib/actions/cart.actions', () => ({
  addItemToCart: jest.fn(),
  removeItemFromCart: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => {
  const toast = jest.fn();
  return { toast, useToast: () => ({ toast }) };
});

const mockAdd = addItemToCart as jest.Mock;
const mockRemove = removeItemFromCart as jest.Mock;
const mockToast = toast as jest.Mock;

describe('AddToCart', () => {
  it('shows a single "Add to cart" button when the item is not in the cart', () => {
    renderWithI18n(<AddToCart item={CART_ITEM} />);

    expect(screen.getByRole('button', { name: t('ADD_TO_CART') })).toBeEnabled();
    expect(screen.queryByRole('link', { name: t('VIEW_CART') })).not.toBeInTheDocument();
  });

  // The server already translates its messages
  it('adds the item and toasts the server message', async () => {
    mockAdd.mockResolvedValue({ success: true, message: t('TOAST_ADDED', { name: 'Volcanic Lamp' }) });
    renderWithI18n(<AddToCart item={CART_ITEM} />);

    await userEvent.click(screen.getByRole('button', { name: t('ADD_TO_CART') }));

    expect(mockAdd).toHaveBeenCalledWith({ productId: CART_ITEM.productId });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        description: t('TOAST_ADDED', { name: 'Volcanic Lamp' }),
      })
    );
  });

  it('shows a server error as an error toast', async () => {
    mockAdd.mockResolvedValue({ success: false, message: t('TOAST_NO_STOCK') });
    renderWithI18n(<AddToCart item={CART_ITEM} />);

    await userEvent.click(screen.getByRole('button', { name: t('ADD_TO_CART') }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        description: t('TOAST_NO_STOCK'),
      })
    );
  });

  it('shows the quantity stepper and a cart link when the item is in the cart', () => {
    renderWithI18n(<AddToCart cart={CART} item={CART_ITEM} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('ADD_ONE') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('REMOVE_ONE') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('VIEW_CART') })).toHaveAttribute('href', '/cart');
  });

  it('removes one item with the minus button', async () => {
    mockRemove.mockResolvedValue({ success: true, message: t('TOAST_REMOVED', { name: 'Volcanic Lamp' }) });
    renderWithI18n(<AddToCart cart={CART} item={CART_ITEM} />);

    await userEvent.click(screen.getByRole('button', { name: t('REMOVE_ONE') }));

    expect(mockRemove).toHaveBeenCalledWith(CART_ITEM.productId);
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        description: t('TOAST_REMOVED', { name: 'Volcanic Lamp' }),
      })
    );
  });

  it('disables the stepper while a request is pending', async () => {
    let resolve!: (value: { success: boolean; message: string }) => void;
    mockAdd.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithI18n(<AddToCart cart={CART} item={CART_ITEM} />);

    await userEvent.click(screen.getByRole('button', { name: t('ADD_ONE') }));

    expect(screen.getByRole('button', { name: t('ADD_ONE') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('REMOVE_ONE') })).toBeDisabled();

    resolve({ success: true, message: 'ok' });
    await waitFor(() => expect(screen.getByRole('button', { name: t('ADD_ONE') })).toBeEnabled());
  });
});
