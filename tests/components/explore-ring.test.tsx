/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

beforeAll(() => {
  // Turns at once, as with reduced motion.
  window.matchMedia = jest.fn().mockReturnValue({ matches: true });
});

beforeEach(() => mockPush.mockClear());

const renderRing = (activeKey: string) =>
  render(<ExploreRing items={ITEMS} activeKey={activeKey} label='Categories' previousLabel='Previous' nextLabel='Next' />);

describe('ExploreRing', () => {
  it('puts every choice, "everything" too, on the wheel and names only the one in front', () => {
    renderRing('events');

    const ring = screen.getByRole('navigation', { name: 'Categories' });
    expect(within(ring).getAllByRole('link')).toHaveLength(3);
    expect(within(ring).getByRole('link', { name: 'Events' })).toHaveAttribute('aria-current', 'page');
    expect(within(ring).getByText('Events')).toBeInTheDocument();
    expect(within(ring).queryByText('Everything')).not.toBeInTheDocument();
  });

  it('turns round with the arrows, past the last back to "everything"', async () => {
    renderRing('events');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(mockPush).toHaveBeenLastCalledWith('/explore', { scroll: false }));

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() => expect(mockPush).toHaveBeenLastCalledWith('/explore?hoy', { scroll: false }));
    // Quick turns open only the one the wheel stops at.
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it('turns a tapped circle to the front and opens it', async () => {
    renderRing('all');

    await userEvent.click(screen.getByRole('link', { name: 'Events' }));
    await waitFor(() => expect(mockPush).toHaveBeenLastCalledWith('/explore?tipo=eventos', { scroll: false }));
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('turns with the arrow keys', async () => {
    renderRing('all');

    fireEvent.keyDown(screen.getByRole('link', { name: 'Everything' }), { key: 'ArrowRight' });
    await waitFor(() => expect(mockPush).toHaveBeenLastCalledWith('/explore?hoy', { scroll: false }));
  });

  it('leaves up and down scrolling to the page and turns with sideways scrolling', async () => {
    renderRing('all');

    const wheel = screen.getByRole('navigation', { name: 'Categories' }).querySelector('[aria-roledescription="carousel"]')!;
    expect(fireEvent.wheel(wheel, { deltaY: 100 })).toBe(true);

    expect(fireEvent.wheel(wheel, { deltaX: 80 })).toBe(false);
    await waitFor(() => expect(mockPush).toHaveBeenLastCalledWith('/explore?hoy', { scroll: false }));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('turns with Shift + mouse wheel and leaves pinch zoom alone', async () => {
    renderRing('all');

    const wheel = screen.getByRole('navigation', { name: 'Categories' }).querySelector('[aria-roledescription="carousel"]')!;
    expect(fireEvent.wheel(wheel, { deltaX: 80, ctrlKey: true })).toBe(true);
    expect(fireEvent.wheel(wheel, { deltaY: -80, shiftKey: true })).toBe(false);
    await waitFor(() => expect(mockPush).toHaveBeenLastCalledWith('/explore?tipo=eventos', { scroll: false }));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("follows the browser's back button without opening the page again", async () => {
    const { rerender } = renderRing('events');

    rerender(<ExploreRing items={ITEMS} activeKey='today' label='Categories' previousLabel='Previous' nextLabel='Next' />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
