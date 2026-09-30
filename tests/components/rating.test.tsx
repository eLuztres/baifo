/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import Rating from '@/components/shared/product/rating';

// Each star kind has a distinct path; the first command tells them apart.
const FULL = 'M3.612';
const HALF = 'M5.354';
const EMPTY = 'M2.866';

function starKinds(container: HTMLElement) {
  return Array.from(container.querySelectorAll('path')).map((path) => {
    const d = path.getAttribute('d') ?? '';
    if (d.startsWith(FULL)) return 'full';
    if (d.startsWith(HALF)) return 'half';
    if (d.startsWith(EMPTY)) return 'empty';
    return 'unknown';
  });
}

describe('Rating', () => {
  it('always renders five stars', () => {
    const { container } = render(<Rating value={0} />);
    expect(starKinds(container)).toEqual(Array(5).fill('empty'));
  });

  it('renders full and half stars for 3.5', () => {
    const { container } = render(<Rating value={3.5} />);
    expect(starKinds(container)).toEqual(['full', 'full', 'full', 'half', 'empty']);
  });

  it('renders five full stars for 5', () => {
    const { container } = render(<Rating value={5} />);
    expect(starKinds(container)).toEqual(Array(5).fill('full'));
  });

  it('shows the caption only when given', () => {
    const { rerender } = render(<Rating value={4} />);
    expect(screen.queryByText('2 reviews')).not.toBeInTheDocument();

    rerender(<Rating value={4} caption='2 reviews' />);
    expect(screen.getByText('2 reviews')).toBeInTheDocument();
  });
});
