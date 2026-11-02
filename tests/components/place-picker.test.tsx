/** @jest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlacePicker from '@/components/shared/header/place-picker';
import { PLACES_COOKIE, PLACES_STORAGE_KEY, type ShopPlace } from '@/lib/places-core';
import { renderWithI18n } from '../utils/render-with-i18n';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const PLACES: ShopPlace[] = [
  { id: '1', slug: 'corralejo', name: 'Corralejo', x: 0, y: 0, isLive: true, corralName: 'Corral Corralejo', hostName: 'Chantal Montaldo', hostImage: '/chantal.jpg' },
  { id: '2', slug: 'el-cotillo', name: 'El Cotillo', x: 0, y: 0, isLive: true, corralName: 'Corral Cotillo' },
  { id: '3', slug: 'morro-jable', name: 'Morro Jable', x: 0, y: 0, isLive: false, corralName: 'Corral Morro' },
];

const corralLinks = () =>
  screen
    .queryAllByRole('link')
    .filter((link) => link.getAttribute('href')?.startsWith('/corral/'))
    .map((link) => link.getAttribute('href'));

const openPicker = async (places = PLACES, savedSlugs: string[] = []) => {
  renderWithI18n(<PlacePicker places={places} savedSlugs={savedSlugs} />);
  await userEvent.click(screen.getByRole('button', { name: 'The corrales' }));
  return screen.findByRole('dialog');
};

beforeAll(() => {
  // jsdom has no matchMedia, which the drawer (vaul) asks on open.
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList;
});

beforeEach(() => {
  localStorage.removeItem(PLACES_STORAGE_KEY);
  refresh.mockClear();
});

describe('PlacePicker button', () => {
  it('says Corrales, not the names of the places', () => {
    renderWithI18n(<PlacePicker places={PLACES} savedSlugs={[]} />);
    expect(screen.getByRole('button', { name: 'The corrales' })).toHaveTextContent('Corrales');
    expect(screen.queryByText(/Corralejo|El Cotillo/)).not.toBeInTheDocument();
  });
});

describe('PlacePicker people', () => {
  it('opens the corral of every live place, never one that is not live', async () => {
    await openPicker();
    expect(corralLinks()).toEqual(['/corral/corralejo', '/corral/el-cotillo']);
  });

  it('shows the host by first name, with their town', async () => {
    await openPicker();
    expect(screen.getByText('Chantal')).toBeInTheDocument();
    expect(screen.getByText('Meet Chantal')).toBeInTheDocument();
    expect(screen.getByText('Corralejo')).toBeInTheDocument();
  });

  it('names a place without a host and invites to visit its corral', async () => {
    await openPicker();
    expect(screen.getByText('El Cotillo')).toBeInTheDocument();
    expect(screen.getByText('Visit the Corral Cotillo')).toBeInTheDocument();
  });

  it('shows a live place without a corral, but not as a link', async () => {
    const places = PLACES.map((place) => (place.slug === 'el-cotillo' ? { ...place, corralName: undefined } : place));
    await openPicker(places);
    expect(screen.getByText('El Cotillo')).toBeInTheDocument();
    expect(corralLinks()).toEqual(['/corral/corralejo']);
  });

  it('lists the places still to come', async () => {
    await openPicker();
    expect(screen.getByText(/Morro Jable/)).toBeInTheDocument();
  });
});

describe('PlacePicker saved places', () => {
  it('shows the whole island again to a visitor who chose fewer places before', () => {
    renderWithI18n(<PlacePicker places={PLACES} savedSlugs={['corralejo']} />);
    expect(localStorage.getItem(PLACES_STORAGE_KEY)).toBe('corralejo,el-cotillo');
    expect(document.cookie).toContain(`${PLACES_COOKIE}=corralejo,el-cotillo`);
    expect(refresh).toHaveBeenCalled();
  });

  it('leaves a visitor who sees every place as they are', () => {
    renderWithI18n(<PlacePicker places={PLACES} savedSlugs={[]} />);
    expect(refresh).not.toHaveBeenCalled();
  });
});
