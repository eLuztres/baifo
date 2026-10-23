/** @jest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminSearch from '@/components/admin/admin-search';
import { renderWithI18n } from '../utils/render-with-i18n';

let mockPathname = '/admin/products';
let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

function searchForm() {
  return screen.getByRole('searchbox').closest('form');
}

describe('AdminSearch', () => {
  it.each([
    ['/admin/orders', '/admin/orders'],
    ['/admin/orders/123', '/admin/orders'],
    ['/admin/users', '/admin/users'],
    ['/admin/products', '/admin/products'],
    ['/admin/overview', '/admin/products'],
  ])('on %s it searches %s', (pathname, action) => {
    mockPathname = pathname;
    renderWithI18n(<AdminSearch />);

    expect(searchForm()).toHaveAttribute('action', action);
    expect(searchForm()).toHaveAttribute('method', 'GET');
  });

  it('prefills the current query and lets the user edit it', async () => {
    mockSearchParams = new URLSearchParams('query=lamp');
    renderWithI18n(<AdminSearch />);

    const input = screen.getByRole('searchbox');
    expect(input).toHaveValue('lamp');
    expect(input).toHaveAttribute('name', 'query');

    await userEvent.clear(input);
    await userEvent.type(input, 'vase');
    expect(input).toHaveValue('vase');
  });
});
