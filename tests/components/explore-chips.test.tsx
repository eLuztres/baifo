/** @jest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import ExploreChips, { type ExploreChip } from '@/components/shared/explore-chips';

const chip = (key: string, isActive = false): ExploreChip => ({ key, label: key, href: `/explore?c=${key}`, isActive });

describe('ExploreChips', () => {
  it('moves chosen chips right after "Todo", so they are in sight on a phone', () => {
    render(<ExploreChips label='Filters' chips={[chip('Todo'), chip('Bikes'), chip('Surf', true), chip('Home')]} />);

    const labels = within(screen.getByRole('navigation', { name: 'Filters' }))
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual(['Todo', 'Surf', 'Bikes', 'Home']);
  });

  it('marks the chosen chip as current and links to where tapping goes', () => {
    render(<ExploreChips label='Filters' chips={[chip('Todo'), chip('Surf', true)]} />);

    expect(screen.getByRole('link', { name: 'Surf' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Todo' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Surf' })).toHaveAttribute('href', '/explore?c=Surf');
  });
});
