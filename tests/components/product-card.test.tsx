/** @jest-environment jsdom */
import { screen, within } from '@testing-library/react';
import ProductCard from '@/components/shared/product/product-card';
import { renderWithI18n, t } from '../utils/render-with-i18n';
import { PRODUCT, displayPrice } from '../utils/fixtures';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/actions/cart.actions', () => ({
  addItemToCart: jest.fn(),
  removeItemFromCart: jest.fn(),
}));
jest.mock('@/components/ProductMedia', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt} />,
}));

describe('ProductCard', () => {
  it('shows category, name, price and links to the product page', () => {
    renderWithI18n(<ProductCard product={PRODUCT} />);

    expect(screen.getByText('Lamps')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Volcanic Lamp' })).toBeInTheDocument();
    expect(screen.getByText(displayPrice(PRODUCT.price))).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/product/volcanic-lamp'));
  });

  it('uses the first image as the cover', () => {
    renderWithI18n(<ProductCard product={PRODUCT} />);
    expect(screen.getByRole('img', { name: 'Volcanic Lamp' })).toHaveAttribute('src', PRODUCT.images[0]);
  });

  it('shows the buy buttons when in stock', () => {
    renderWithI18n(<ProductCard product={PRODUCT} />);

    expect(screen.getByRole('button', { name: t('ADD_TO_CART') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('BUY_NOW') })).toBeInTheDocument();
    expect(screen.queryByText(t('SOLD_OUT'))).not.toBeInTheDocument();
  });

  it('shows a "Sold out" badge and hides the buy buttons when out of stock', () => {
    renderWithI18n(<ProductCard product={{ ...PRODUCT, stock: 0 }} />);

    const imageLink = screen.getAllByRole('link')[0];
    expect(within(imageLink).getByText(t('SOLD_OUT'))).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
