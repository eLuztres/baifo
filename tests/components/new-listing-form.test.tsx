/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NewListingForm from '@/components/marketplace/new-listing-form';
import { createAdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/marketplace/admin.actions', () => ({
  createAdminListing: jest.fn(),
  getAdminListing: jest.fn(),
  updateAdminListingPhotos: jest.fn(),
}));
jest.mock('@/lib/uploadthing', () => ({ useUploadThing: () => ({ startUpload: jest.fn() }) }));
jest.mock('@/lib/video-upload', () => ({ uploadVideos: jest.fn() }));
jest.mock('@/lib/prepare-photos', () => ({ preparePhotos: jest.fn() }));
jest.mock('@/components/ProductMedia', () => () => null);

// Any text the form shows is just its key, so the buttons can be found by it.
const texts = new Proxy({}, { get: (_, key) => String(key) }) as AdminTexts;
const mockCreate = createAdminListing as jest.Mock;

beforeEach(() => {
  mockPush.mockClear();
  mockCreate.mockReset();
});

describe('NewListingForm', () => {
  it('stays on the new-listing page once the listing is made', async () => {
    mockCreate.mockResolvedValue({ success: true, id: 'abc' });
    render(<NewListingForm texts={texts} type='WANTED' />);

    fireEvent.click(screen.getByRole('button', { name: /noPhoto/ }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/listings/new?anuncio=abc'));
    expect(mockCreate).toHaveBeenCalledWith({ photos: [], type: 'WANTED', useAi: true });
  });

  it('stays put and shows the message when the listing could not be made', async () => {
    mockCreate.mockResolvedValue({ success: false, message: 'Something went wrong' });
    render(<NewListingForm texts={texts} type='WANTED' />);

    fireEvent.click(screen.getByRole('button', { name: /noPhoto/ }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
