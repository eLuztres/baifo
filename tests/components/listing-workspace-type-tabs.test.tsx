/** @jest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingWorkspace from '@/components/marketplace/listing-workspace';
import { getAdminListing, updateAdminListingPhotos, type AdminListing } from '@/lib/marketplace/admin.actions';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { renderWithI18n } from '../utils/render-with-i18n';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }));
jest.mock('@/lib/marketplace/admin.actions', () => ({
  createAdminListing: jest.fn(),
  describeAdminListing: jest.fn(),
  getAdminListing: jest.fn(),
  retryAdminListing: jest.fn(),
  updateAdminListingPhotos: jest.fn(),
}));
jest.mock('@/lib/uploadthing', () => ({ useUploadThing: () => ({ startUpload: jest.fn() }) }));
jest.mock('@/lib/video-upload', () => ({ uploadVideos: jest.fn() }));
jest.mock('@/lib/prepare-photos', () => ({ preparePhotos: jest.fn() }));
jest.mock('@/components/ProductMedia', () => () => null);
jest.mock('@/lib/marketplace/payment.actions', () => ({ markListingPaid: jest.fn(), recordWhatsAppConsent: jest.fn() }));
jest.mock('@/components/marketplace/address-input', () => ({ __esModule: true, default: () => null }));

const texts = adminTexts('es');
const mockSave = updateAdminListingPhotos as jest.Mock;
const mockGet = getAdminListing as jest.Mock;
const PHOTO = 'https://x.ufs.sh/f/bike.jpg';

const LISTING = {
  id: 'listing-1',
  status: 'COLLECTING',
  type: 'PRODUCT',
  createdByAdmin: true,
  usesAi: true,
  title: null,
  rawText: '',
  textMode: 'ai',
  originalTitle: null,
  rawImages: [PHOTO],
  images: ['https://x.ufs.sh/f/bike-ai.jpg'],
  aiImages: ['https://x.ufs.sh/f/bike-ai.jpg'],
  lastError: null,
  seller: { waId: 'house', name: null },
} as unknown as AdminListing;

const renderWorkspace = (listing: Partial<AdminListing> = {}) =>
  renderWithI18n(
    <ListingWorkspace initial={{ ...LISTING, ...listing } as AdminListing} categories={[]} places={[]} languages={[]} shopLanguage={{ id: 'es', label: 'ES' }} texts={texts} />,
  );

const switchTo = (label: string) => userEvent.click(screen.getByRole('radio', { name: label }));

beforeEach(() => {
  mockSave.mockReset().mockResolvedValue({ success: true });
  mockGet.mockReset().mockImplementation(async () => null);
});

describe('ListingWorkspace type tabs', () => {
  it('keeps what was written and changes only what depends on the type', async () => {
    renderWorkspace();
    const notes = screen.getByPlaceholderText(texts.tellPlaceholder);
    await userEvent.type(notes, 'Bici de montaña');

    await switchTo(texts.type_SERVICE);

    expect(mockSave).toHaveBeenCalledWith('listing-1', { photos: [PHOTO], useAi: true, type: 'SERVICE' });
    expect(screen.getByPlaceholderText(texts.tellServicePlaceholder)).toHaveValue('Bici de montaña');
  });

  it('uses an event’s photos as they are, and turns the AI pictures back on when leaving it', async () => {
    renderWorkspace();

    await switchTo(texts.type_EVENT);
    expect(mockSave).toHaveBeenLastCalledWith('listing-1', { photos: [PHOTO], useAi: false, type: 'EVENT' });

    await switchTo(texts.type_PRODUCT);
    expect(mockSave).toHaveBeenLastCalledWith('listing-1', { photos: [PHOTO], useAi: true, type: 'PRODUCT' });
  });

  it('keeps the AI picture of an event without any photo', async () => {
    renderWorkspace({ rawImages: [], images: [], aiImages: [] });

    await switchTo(texts.type_EVENT);

    expect(mockSave).toHaveBeenCalledWith('listing-1', { photos: [], useAi: true, type: 'EVENT' });
  });

  it('goes back to the old type when the switch could not be saved', async () => {
    mockSave.mockResolvedValue({ success: false, message: 'La IA ya está escribiendo este anuncio' });
    renderWorkspace();

    await switchTo(texts.type_WANTED);

    expect(await screen.findByRole('alert')).toHaveTextContent('La IA ya está escribiendo este anuncio');
    await waitFor(() => expect(screen.getByRole('radio', { name: texts.type_PRODUCT })).toHaveAttribute('aria-checked', 'true'));
  });

  it('locks the tabs while the AI writes the listing', () => {
    renderWorkspace({ status: 'PROCESSING' });

    expect(screen.getByRole('radio', { name: texts.type_WANTED })).toBeDisabled();
  });
});
