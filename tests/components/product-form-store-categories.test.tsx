/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductForm from '@/components/admin/product-form';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({ t: (key: string) => key }),
  useTranslateMessage: () => (key: string) => key,
}));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/lib/actions/product.actions', () => ({ createProduct: jest.fn(), updateProduct: jest.fn() }));
jest.mock('@/lib/uploadthing', () => ({ UploadButton: () => null }));
jest.mock('@/lib/prepare-photos', () => ({ preparePhotos: jest.fn() }));
jest.mock('@/components/ProductMedia', () => () => null);
jest.mock('@/components/admin/description-from-info', () => () => null);
jest.mock('@/components/shared/hiding-bottom-bar', () => {
  const HidingBottomBar = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return HidingBottomBar;
});

const STORE_CATEGORIES = [
  { id: 'a', name: 'Rings' },
  { id: 'b', name: 'Necklaces' },
  { id: 'c', name: 'Earrings' },
];

describe('ProductForm store categories', () => {
  it('picks several categories from one dropdown', async () => {
    const user = userEvent.setup();
    render(<ProductForm type='Create' priceClasses={[]} storeCategories={STORE_CATEGORIES} />);

    const trigger = screen.getByRole('button', { name: 'PRODUCT_FORM_STORE_CATEGORIES_NONE' });
    await user.click(trigger);
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Rings' }));
    // The menu stays open, so the next one can be checked right away.
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Earrings' }));
    expect(trigger).toHaveTextContent('Rings, Earrings');

    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Rings' }));
    expect(trigger).toHaveTextContent('Earrings');
    expect(trigger).not.toHaveTextContent('Rings');
  });
});
