/** @jest-environment jsdom */
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlacePicker from '@/components/shared/header/place-picker';
import { PLACES_STORAGE_KEY, type ShopPlace } from '@/lib/places-core';
import { renderWithI18n } from '../utils/render-with-i18n';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
// The SVG map isn't what's tested here.
jest.mock('@/components/shared/island-map', () => ({ __esModule: true, default: () => null }));

const PLACES: ShopPlace[] = [
  { id: '1', slug: 'corralejo', name: 'Corralejo', x: 0, y: 0, isLive: true, corralName: 'Corral Corralejo' },
  { id: '2', slug: 'el-cotillo', name: 'El Cotillo', x: 0, y: 0, isLive: true, corralName: 'Corral Cotillo' },
  { id: '3', slug: 'morro-jable', name: 'Morro Jable', x: 0, y: 0, isLive: false, corralName: 'Corral Morro' },
];

const corralLinks = () =>
  screen
    .queryAllByRole('link')
    .filter((link) => link.getAttribute('href')?.startsWith('/corral/'))
    .map((link) => link.getAttribute('href'));

const openPicker = async (savedSlugs: string[], places = PLACES) => {
  renderWithI18n(<PlacePicker places={places} savedSlugs={savedSlugs} />);
  await userEvent.click(screen.getByRole('button'));
  return screen.findByRole('dialog');
};

beforeAll(() => {
  // jsdom has no matchMedia, which the drawer (vaul) asks on open.
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList;
});

beforeEach(() => {
  localStorage.removeItem(PLACES_STORAGE_KEY);
});

describe('PlacePicker Corral links', () => {
  it('shows only the Corral of the one chosen place', async () => {
    await openPicker(['el-cotillo']);
    expect(corralLinks()).toEqual(['/corral/el-cotillo']);
  });

  it('shows every live Corral for the whole island, never one of a place that is not live', async () => {
    await openPicker([]);
    expect(corralLinks()).toEqual(['/corral/corralejo', '/corral/el-cotillo']);
  });

  it('switches the Corral link when the visitor switches places', async () => {
    const dialog = await openPicker(['corralejo']);
    expect(corralLinks()).toEqual(['/corral/corralejo']);

    // fireEvent: the drawer's drag handling needs pointer capture, which jsdom lacks.
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'El Cotillo' }));
    expect(corralLinks()).toEqual(['/corral/corralejo', '/corral/el-cotillo']);

    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Corralejo' }));
    expect(corralLinks()).toEqual(['/corral/el-cotillo']);
  });

  it('shows no Corral list when the chosen place has no Corral', async () => {
    const places = PLACES.map((place) => (place.slug === 'el-cotillo' ? { ...place, corralName: undefined } : place));
    await openPicker(['el-cotillo'], places);
    expect(corralLinks()).toEqual([]);
  });
});

describe('PlacePicker label', () => {
  const pickerLabel = (savedSlugs: string[], places = PLACES) => {
    renderWithI18n(<PlacePicker places={places} savedSlugs={savedSlugs} />);
    return screen.getByRole('button').getAttribute('aria-label');
  };

  it('names the one chosen place', () => {
    expect(pickerLabel(['el-cotillo'])).toMatch(/: El Cotillo$/);
  });

  it('names the chosen places, not the whole island, while a place is still to come', () => {
    expect(pickerLabel(['el-cotillo', 'corralejo'])).toMatch(/: Corralejo · El Cotillo$/);
    expect(screen.getByText('Corralejo +1')).toBeInTheDocument();
  });

  it('shows the first place plus a count when more than two are chosen', () => {
    const places = [...PLACES, { id: '4', slug: 'caleta', name: 'Caleta de Fuste', x: 0, y: 0, isLive: true }];
    expect(pickerLabel(['caleta', 'el-cotillo', 'corralejo'], places)).toMatch(/: Corralejo · El Cotillo · Caleta de Fuste$/);
    expect(screen.getByText('Corralejo +2')).toBeInTheDocument();
    expect(screen.queryByText('Corralejo · El Cotillo · Caleta de Fuste')).not.toBeInTheDocument();
  });

  it('says whole island only when every place is chosen', () => {
    const places = PLACES.map((place) => ({ ...place, isLive: true }));
    expect(pickerLabel([], places)).toMatch(/: Whole island$/);
  });

  it('offers to choose all live places in the drawer, without calling it the whole island', async () => {
    const drawer = await openPicker(['corralejo']);
    expect(within(drawer).getByRole('button', { name: 'Choose all' })).toBeInTheDocument();
    expect(within(drawer).queryByText('Whole island')).not.toBeInTheDocument();
  });
});
