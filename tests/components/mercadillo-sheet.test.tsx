/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import MercadilloSheet from '@/components/shared/home/mercadillo-sheet';

const mercadillos = (count: number) => Array.from({ length: count }, (_, index) => ({ slug: `m${index}`, name: `Mercadillo ${index}`, icon: null }));

describe('MercadilloSheet on the start page', () => {
  it('shows nothing without Mercadillos', () => {
    const { container } = render(<MercadilloSheet label='Mercadillos' mercadillos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is one button until it is opened', () => {
    render(<MercadilloSheet label='Mercadillos' mercadillos={mercadillos(8)} />);
    expect(screen.getByRole('button', { name: 'Mercadillos' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('slides up every Mercadillo, each opening its listings', () => {
    render(<MercadilloSheet label='Mercadillos' mercadillos={mercadillos(8)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mercadillos' }));
    const sheet = screen.getByRole('dialog', { name: 'Mercadillos' });
    expect(within(sheet).getAllByRole('link')).toHaveLength(8);
    expect(within(sheet).getByRole('link', { name: 'Mercadillo 7' })).toHaveAttribute('href', '/explore?mercadillo=m7');
  });
});
