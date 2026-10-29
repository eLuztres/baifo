/** @jest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExploreRing, { type ExploreRingItem } from '@/components/shared/explore-ring';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const ITEMS: ExploreRingItem[] = [
  { key: 'all', label: 'Everything', href: '/explore' },
  { key: 'today', label: 'Today', href: '/explore?hoy' },
  { key: 'events', label: 'Events', href: '/explore?tipo=eventos' },
];
const BACK = { href: '/explore', label: 'Everything' };

beforeAll(() => {
  // jsdom has no element scrolling.
  Element.prototype.scrollTo = jest.fn();
});

const renderRing = (activeKey: string, back?: typeof BACK) =>
  render(<ExploreRing items={ITEMS} activeKey={activeKey} label='Categories' previousLabel='Previous' nextLabel='Next' back={back} />);

describe('ExploreRing', () => {
  it('keeps "everything" in the ring when there is no way back', () => {
    renderRing('all');

    const ring = screen.getByRole('navigation', { name: 'Categories' });
    expect(within(ring).getByRole('link', { name: 'Everything' })).toHaveAttribute('aria-current', 'page');
    expect(within(ring).getAllByRole('link')).toHaveLength(3);
  });

  it('shows one back link instead of the ring\'s "everything" item, and names the chosen one once', () => {
    renderRing('events', BACK);

    const ring = screen.getByRole('navigation', { name: 'Categories' });
    const everythingLinks = within(ring).getAllByRole('link', { name: 'Everything' });
    expect(everythingLinks).toHaveLength(1);
    expect(everythingLinks[0]).toHaveAttribute('href', '/explore');
    expect(everythingLinks[0]).not.toHaveAttribute('aria-current');
    expect(within(ring).getAllByText('Events')).toHaveLength(1);
  });

  it('turns round among the categories only, never to "everything"', async () => {
    renderRing('today', BACK);

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(mockPush).toHaveBeenLastCalledWith('/explore?tipo=eventos', { scroll: false });

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(mockPush).toHaveBeenLastCalledWith('/explore?hoy', { scroll: false });
  });
});
