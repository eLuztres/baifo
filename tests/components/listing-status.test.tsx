/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingStatus from '@/components/marketplace/listing-status';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

const texts = {
  status_IN_REVIEW: 'To review',
  status_LIVE: 'Online',
  status_HIDDEN: 'Hidden',
  status_SOLD: 'Sold',
  listingStatusLabel: 'Status',
  stateLive: 'Everyone sees it in the shop.',
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

  it('changes the status from a dropdown', async () => {
    const onChoose = jest.fn();
    render(<ListingStatus status='LIVE' type='PRODUCT' saveState='idle' texts={texts} choices={['HIDDEN', 'SOLD']} onChoose={onChoose} />);

    const select = screen.getByRole('combobox', { name: 'Status' });
    expect(select).toHaveValue('LIVE');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Online', 'Hidden', 'Sold']);
    await userEvent.selectOptions(select, 'HIDDEN');

    expect(onChoose).toHaveBeenCalledWith('HIDDEN');
  });
});
