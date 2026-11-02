/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import MainNav from '@/app/admin/main-nav';

let mockPathname = '/admin/listings/new';
let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));
jest.mock('@/components/i18n-provider', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

const setAddress = (pathname: string, search = '') => {
  mockPathname = pathname;
  mockSearchParams = new URLSearchParams(search);
};

const renderNav = () =>
  render(
    <MainNav
      isShowcase={false}
      isAiEnabled={false}
      isOffersEnabled={false}
      newProductHref='/admin/listings/new'
      extraLinks={[{ href: '/admin/listings', label: 'Listings' }]}
    />
  );

// A link, or the button that opens "Crear"'s choice.
const activeLink = () => document.querySelector('[aria-current="page"]');

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

describe('MainNav', () => {
  it('lights "New" on the creation page', () => {
    setAddress('/admin/listings/new');
    renderNav();

    expect(activeLink()).toHaveTextContent('ADMIN_NEW_PRODUCT');
  });

  it('asks Anuncio or Evento first, each going to its own new listing', () => {
    setAddress('/admin/listings');
    renderNav();

    fireEvent.click(screen.getByRole('button', { name: 'ADMIN_NEW_PRODUCT' }));

    expect(screen.getByRole('link', { name: /CREATE_AD/ })).toHaveAttribute('href', '/admin/listings/new');
    expect(screen.getByRole('link', { name: /CREATE_EVENT/ })).toHaveAttribute('href', '/admin/listings/new?tipo=eventos');
  });

  it('keeps "New" lit on a listing that is still being created', () => {
    setAddress('/admin/listings/abc', 'nuevo=1');
    renderNav();

    expect(activeLink()).toHaveTextContent('ADMIN_NEW_PRODUCT');
  });

  it('lights "Listings" on a listing opened from the list', () => {
    setAddress('/admin/listings/abc');
    renderNav();

    expect(activeLink()).toHaveTextContent('Listings');
  });
});
