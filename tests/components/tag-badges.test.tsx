/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import TagBadges from '@/components/shared/product/tag-badges';

const TAGS = [
  { id: '11111111-1111-4111-8111-111111111111', names: { es: 'Música', en: 'Music' } },
  { id: '22222222-2222-4222-8222-222222222222', names: { es: 'Hogar, objetos y jardín', en: 'Home, things and garden' } },
];

describe('TagBadges', () => {
  it('links each etiqueta to its list by a readable name, never by its id', () => {
    render(<TagBadges tags={TAGS} locale='es' isLinked />);
    expect(screen.getByRole('link', { name: 'Música' })).toHaveAttribute('href', '/explore?etiqueta=musica');
    expect(screen.getByRole('link', { name: 'Hogar, objetos y jardín' })).toHaveAttribute('href', '/explore?etiqueta=hogar-objetos-y-jardin');
  });

  it("uses the visitor's language for the name and the link", () => {
    render(<TagBadges tags={TAGS} locale='en' isLinked />);
    expect(screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Home, things and garden', '/explore?etiqueta=home-things-and-garden'],
      ['Music', '/explore?etiqueta=music'],
    ]);
  });

  it('has no links inside a card, which is a link itself', () => {
    render(<TagBadges tags={TAGS} locale='es' />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Música')).toBeInTheDocument();
  });

  it('shows nothing without etiquetas', () => {
    const { container } = render(<TagBadges tags={[]} locale='es' isLinked />);
    expect(container).toBeEmptyDOMElement();
  });
});
