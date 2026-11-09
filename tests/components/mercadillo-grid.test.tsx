/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import MercadilloGrid from '@/components/shared/home/mercadillo-grid';

const mercadillos = (count: number) => Array.from({ length: count }, (_, index) => ({ slug: `m${index}`, name: `Mercadillo ${index}`, icon: null }));

describe('MercadilloGrid on the start page', () => {
  it('shows nothing without Mercadillos', () => {
    const { container } = render(<MercadilloGrid label='Mercadillos' mercadillos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps up to six on one page, each opening its listings', () => {
    render(<MercadilloGrid label='Mercadillos' mercadillos={mercadillos(6)} />);
    expect(screen.getAllByRole('list')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Mercadillo 0' })).toHaveAttribute('href', '/explore?mercadillo=m0');
  });

  it('puts more than six on pages of six', () => {
    render(<MercadilloGrid label='Mercadillos' mercadillos={mercadillos(13)} />);
    const pages = screen.getAllByRole('list');
    expect(pages.map((page) => page.children.length)).toEqual([6, 6, 1]);
  });
});
