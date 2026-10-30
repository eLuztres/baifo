/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import ListingSteps from '@/components/marketplace/listing-steps';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

const texts = { stepPhotos: 'Photos', stepDetails: 'Description', stepContact: 'Contact' } as AdminTexts;

describe('ListingSteps', () => {
  it('shows plain steps when the admin can not switch', () => {
    render(<ListingSteps current={1} texts={texts} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('makes only the other steps buttons, and jumps to them', () => {
    const onSelect = jest.fn();
    render(<ListingSteps current={1} texts={texts} onSelect={onSelect} />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Photos/ }));
    expect(onSelect).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByRole('button', { name: /Contact/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('marks the current step', () => {
    render(<ListingSteps current={0} texts={texts} onSelect={jest.fn()} />);

    expect(screen.getByText('Photos').parentElement).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /Description/ })).not.toHaveAttribute('aria-current');
  });

  it('shows the numbers 1 to 3 on any step, never a check mark', () => {
    const { container } = render(<ListingSteps current={2} texts={texts} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('fills only the current step, the other one stays an outline', () => {
    render(<ListingSteps current={1} texts={texts} onSelect={jest.fn()} />);

    expect(screen.getByText('2')).toHaveClass('bg-primary');
    expect(screen.getByText('1')).not.toHaveClass('bg-primary');
    expect(screen.getByText('Description')).toHaveClass('font-semibold');
    expect(screen.getByText('Photos')).not.toHaveClass('font-semibold');
  });
});
