/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import AdminEditButton from '@/components/shared/admin-edit-button';
import { isAdmin } from '@/lib/auth-guard';

jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn() }));
jest.mock('@/lib/i18n-server', () => ({ getT: async () => ({ t: (key: string) => key, locale: 'es' }) }));

const mockIsAdmin = isAdmin as jest.Mock;

const renderButton = async (props: { productId: string; submissionId?: string }) => render(await AdminEditButton(props));

describe('AdminEditButton', () => {
  it('shows nothing to visitors', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { container } = await renderButton({ productId: 'p-1', submissionId: 's-1' });

    expect(container).toBeEmptyDOMElement();
  });

  it("opens the listing's editor for an admin", async () => {
    mockIsAdmin.mockResolvedValue(true);
    await renderButton({ productId: 'p-1', submissionId: 's-1' });

    expect(screen.getByRole('link', { name: 'ADMIN_EDIT_LISTING' })).toHaveAttribute('href', '/admin/listings/s-1');
  });

  it('opens the product editor for an old shop product without a listing', async () => {
    mockIsAdmin.mockResolvedValue(true);
    await renderButton({ productId: 'p-1' });

    expect(screen.getByRole('link', { name: 'ADMIN_EDIT_LISTING' })).toHaveAttribute('href', '/admin/products/p-1');
  });
});
