/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import ExploreSearch, { type SearchChoice, type SearchListing } from '@/components/shared/explore-search';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, prefetch: jest.fn() }) }));
jest.mock('@/components/i18n-provider', () => ({ useI18n: () => ({ t: (key: string, values?: { query?: string }) => (values?.query ? `${key}:${values.query}` : key) }) }));

const KINDS: SearchChoice[] = [
  { href: '/explore?tipo=ofrezco', label: 'Ofrezco', count: 61, text: { names: 'ofrezco', rest: '' } },
  { href: '/explore?tipo=busco', label: 'Busco', count: 9, text: { names: 'busco', rest: '' } },
];
const TAGS: SearchChoice[] = [
  { href: '/explore?etiqueta=musica', label: 'Música', count: 2, text: { names: 'musica | music', rest: '' } },
  { href: '/explore?etiqueta=hogar-objetos-y-jardin', label: 'Hogar, objetos y jardín', count: 16, text: { names: 'hogar, objetos y jardin', rest: '' } },
];
const LISTINGS: SearchListing[] = [
  { href: '/product/guitarra', name: 'Guitarra española', image: '/g.jpg', text: { names: 'guitarra espanola', rest: 'musica clasica' } },
];

const renderSearch = (value = '', isFiltered = false) =>
  render(<ExploreSearch listings={LISTINGS} choices={KINDS} tags={TAGS} value={value} isFiltered={isFiltered} />);

const optionTexts = () => within(screen.getByRole('listbox')).getAllByRole('option').map((option) => option.textContent);

beforeEach(() => mockPush.mockReset());

describe('ExploreSearch', () => {
  it('offers the kinds, then the etiquetas, most used first, while the field is empty', () => {
    renderSearch();
    fireEvent.focus(screen.getByRole('combobox'));
    expect(optionTexts()).toEqual(['Ofrezco61', 'Busco9', 'Hogar, objetos y jardín16', 'Música2']);
  });

  it('opens an etiqueta by its readable link, so the list can be shared', () => {
    renderSearch();
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /Música/ }));
    expect(mockPush).toHaveBeenCalledWith('/explore?etiqueta=musica');
  });

  it('finds an etiqueta by its name in another language while typing', () => {
    renderSearch();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'music' } });
    expect(optionTexts()).toContain('Música2');
  });

  it('shows a matching listing by its name alone, with no category line under it', () => {
    renderSearch();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'guitarra' } });
    const listing = screen.getByRole('option', { name: /Guitarra española/ });
    expect(listing.textContent).toBe('Guitarra española');
  });

  it('shows every match on Enter', () => {
    renderSearch();
    const field = screen.getByRole('combobox');
    fireEvent.change(field, { target: { value: 'hogar' } });
    fireEvent.submit(field.closest('form')!);
    expect(mockPush).toHaveBeenCalledWith('/explore?q=hogar');
  });

  it('shows the chosen etiqueta in the field and opens the whole list again when cleared', () => {
    renderSearch('Música', true);
    expect(screen.getByRole('combobox')).toHaveValue('Música');
    fireEvent.click(screen.getByRole('button', { name: 'EXPLORE_SEARCH_CLEAR' }));
    expect(mockPush).toHaveBeenCalledWith('/explore');
  });
});
