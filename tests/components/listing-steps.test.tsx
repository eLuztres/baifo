/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import ListingSteps from '@/components/marketplace/listing-steps';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

const texts = { stepPhotos: 'Photos', stepDetails: 'Description' } as AdminTexts;

describe('ListingSteps', () => {
  it('shows plain steps when the admin can not switch', () => {
    render(<ListingSteps current={1} texts={texts} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('makes only the other step a button, and jumps to it', () => {
    const onSelect = jest.fn();
    render(<ListingSteps current={1} texts={texts} onSelect={onSelect} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Photos/ }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('marks the current step', () => {
    render(<ListingSteps current={0} texts={texts} onSelect={jest.fn()} />);

    expect(screen.getByText('Photos').parentElement).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /Description/ })).not.toHaveAttribute('aria-current');
  });
});
