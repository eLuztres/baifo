/** @jest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingWorkspace from '@/components/marketplace/listing-workspace';
import { getAdminListing, saveAdminListingPictures, type AdminListing } from '@/lib/marketplace/admin.actions';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { renderWithI18n } from '../utils/render-with-i18n';

jest.mock('@/lib/actions/tag.actions', () => ({ translateTags: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }));
jest.mock('@/lib/marketplace/admin.actions', () => ({
  createAdminListingPicture: jest.fn(),
  describeAdminListing: jest.fn(),
  getAdminListing: jest.fn(),
  retryAdminListing: jest.fn(),
  saveAdminListingPictures: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/components/shared/voice-input-button', () => () => null);
jest.mock('@/lib/uploadthing', () => ({ useUploadThing: () => ({ startUpload: jest.fn() }) }));
jest.mock('@/lib/video-upload', () => ({ uploadVideos: jest.fn() }));
jest.mock('@/lib/prepare-photos', () => ({ preparePhotos: jest.fn() }));
jest.mock('@/components/ProductMedia', () => () => null);
jest.mock('@/lib/marketplace/payment.actions', () => ({ markListingPaid: jest.fn(), recordWhatsAppConsent: jest.fn() }));
jest.mock('@/components/marketplace/address-input', () => ({ __esModule: true, default: () => null }));

const texts = adminTexts('es');
const mockSavePictures = saveAdminListingPictures as jest.Mock;
const mockGet = getAdminListing as jest.Mock;
const PHOTO = 'https://x.ufs.sh/f/bike.jpg';

const LISTING = {
  id: 'listing-1',
  status: 'COLLECTING',
  type: 'PRODUCT',
  createdByAdmin: true,
  usesAi: false,
  title: null,
  rawText: '',
  textMode: 'ai',
  originalTitle: null,
  rawImages: [PHOTO],
  tags: [],
  images: ['https://x.ufs.sh/f/bike-ai.jpg'],
  aiImages: ['https://x.ufs.sh/f/bike-ai.jpg'],
  lastError: null,
  seller: { waId: 'house', name: null },
} as unknown as AdminListing;

const renderWorkspace = (listing: Partial<AdminListing> = {}) =>
  renderWithI18n(
    <ListingWorkspace initial={{ ...LISTING, ...listing } as AdminListing} mercadillos={[]} tagOptions={[]} maxTags={5} languages={[]} shopLanguage={{ id: 'es', label: 'ES' }} listingDays={90} texts={texts} />,
  );


beforeEach(() => {
  mockSavePictures.mockReset().mockResolvedValue({ success: true });
  mockGet.mockReset().mockImplementation(async () => null);
});

describe('ListingWorkspace title', () => {
  it('says what is being made, chosen under "Crear", with no type switch while it is made', () => {
    renderWorkspace({ type: 'EVENT' });

    expect(screen.getByRole('heading', { name: texts.newEvent })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: texts.typeLabel })).not.toBeInTheDocument();
  });
});

describe('ListingWorkspace steps', () => {
  it('moves freely between pictures, description and contact', async () => {
    renderWorkspace();

    expect(screen.getByRole('tab', { name: `${texts.photosLabel} 1` })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(texts.stepContact) }));
    expect(screen.getByLabelText(texts.servicePhoneLabel)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(texts.stepPhotos) }));
    expect(screen.getByRole('radio', { name: texts.original })).toBeVisible();
  });

  it('switches a picture tab between its original and its AI version, and saves it', async () => {
    renderWorkspace();

    await userEvent.click(screen.getByRole('radio', { name: texts.original }));

    expect(mockSavePictures).toHaveBeenCalledWith('listing-1', { images: [PHOTO], rawImages: [PHOTO], aiImages: ['https://x.ufs.sh/f/bike-ai.jpg'] });
    expect(screen.getByRole('radio', { name: texts.original })).toHaveAttribute('aria-checked', 'true');
  });
});
