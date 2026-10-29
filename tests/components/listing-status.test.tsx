/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import ListingStatus from '@/components/marketplace/listing-status';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

const texts = {
  status_IN_REVIEW: 'To review',
  stateDraft: 'Not online yet. Only you can see it.',
  saving: 'Saving…',
  savedAll: 'Saved',
  notSaved: 'Not saved',
} as unknown as AdminTexts;

describe('ListingStatus', () => {
  it('shows the status and its hint in one line', () => {
    render(<ListingStatus status='IN_REVIEW' type='PRODUCT' saveState='idle' texts={texts} />);

    expect(screen.getByRole('status')).toHaveTextContent('To review · Not online yet. Only you can see it.');
    expect(screen.getByRole('status').querySelectorAll('p')).toHaveLength(1);
  });

  it('adds the save state next to it', () => {
    render(<ListingStatus status='IN_REVIEW' type='PRODUCT' saveState='failed' texts={texts} />);

    expect(screen.getByText('Not saved')).toBeInTheDocument();
  });
});
