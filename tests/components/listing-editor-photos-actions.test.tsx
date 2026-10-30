/** @jest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingEditor from '@/components/marketplace/listing-editor';
import { type AdminListing } from '@/lib/marketplace/admin.actions';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { renderWithI18n } from '../utils/render-with-i18n';
import { toast } from '@/hooks/use-toast';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }));
jest.mock('@/hooks/use-toast', () => {
  const toast = jest.fn();
  return { toast, useToast: () => ({ toast }) };
});
jest.mock('@/lib/marketplace/admin.actions', () => ({
  chooseListingText: jest.fn(),
  createAdminListingPicture: jest.fn(),
  enableAdminListing: jest.fn(),
  markAdminListingSold: jest.fn(),
  publishAdminListing: jest.fn(),
  rejectAdminListing: jest.fn(),
  shareAdminListing: jest.fn(),
  translateListingText: jest.fn(),
  updateAdminListing: jest.fn(),
}));
jest.mock('@/lib/uploadthing', () => ({ useUploadThing: () => ({ startUpload: (files: File[]) => mockStartUpload(files) }) }));
jest.mock('@/lib/video-upload', () => ({ uploadVideos: jest.fn() }));
jest.mock('@/lib/prepare-photos', () => ({ preparePhotos: (files: File[]) => Promise.resolve(files) }));
jest.mock('@/lib/marketplace/payment.actions', () => ({ markListingPaid: jest.fn(), markRenewalPaid: jest.fn(), recordWhatsAppConsent: jest.fn() }));

const texts = adminTexts('es');
const mockStartUpload = jest.fn();

const listing = {
  id: 'listing-1',
  status: 'LIVE',
  type: 'PRODUCT',
  title: 'Boss RC-500',
  shortTitle: null,
  description: 'Pedal de loops',
  translations: {},
  category: 'music',
  condition: 'GOOD',
  price: '200.00',
  priceMax: null,
  images: ['https://utfs.io/f/a.jpg'],
  rawImages: ['https://utfs.io/f/raw.jpg'],
  aiImages: ['https://utfs.io/f/a.jpg'],
  rawText: '',
  placeId: null,
  serviceType: null,
  startsAt: null,
  address: null,
  plan: 'normal',
  paidAt: new Date('2026-10-01'),
  textMode: null,
  sellerName: null,
  sellerLocale: null,
  seller: { waId: '34600000000', name: 'Ana' },
  sellerDefault: { name: '', locale: 'es' },
  product: { slug: 'boss-rc-500' },
  planPrices: { normal: '5.00', big: '10.00' },
} as unknown as AdminListing;

const renderEditor = () =>
  renderWithI18n(
    <ListingEditor
      listing={listing}
      categories={[{ slug: 'music', name: 'Música' }]}
      places={[]}
      languages={[]}
      shopLanguage={{ id: 'es', label: 'ES' }}
      texts={texts}
      onPublished={jest.fn()}
    />,
  );

describe('ListingEditor photos and actions', () => {
  beforeEach(() => mockStartUpload.mockReset().mockResolvedValue([{ ufsUrl: 'https://utfs.io/f/own.jpg' }]));

  it('appends an uploaded photo as an original, without the AI swap', async () => {
    const { container } = renderEditor();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;

    await userEvent.upload(fileInput, new File(['x'], 'own.jpg', { type: 'image/jpeg' }));

    await waitFor(() => expect(screen.getByRole('button', { name: `${texts.photosLabel} 2` })).toBeInTheDocument());
    // Only the AI picture has its original to swap to.
    expect(screen.getAllByRole('radio', { name: texts.useOriginalPicture })).toHaveLength(1);
    expect(screen.getByText(texts.unsavedChanges)).toBeInTheDocument();
  });

  it('says in plain words when an upload fails, and keeps the pictures as they were', async () => {
    mockStartUpload.mockRejectedValue(new Error('UploadThing: file too large (raw)'));
    const { container } = renderEditor();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;

    await userEvent.upload(fileInput, new File(['x'], 'own.jpg', { type: 'image/jpeg' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ variant: 'destructive', description: texts.uploadFailed }));
    expect(screen.queryByRole('button', { name: `${texts.photosLabel} 2` })).not.toBeInTheDocument();
  });

  it('offers no hide, new listing or view listing, and ends with Delete on the left and the actions on the right', () => {
    renderEditor();

    for (const name of [texts.hide, texts.newAnother, texts.viewListing]) expect(screen.queryByText(name)).not.toBeInTheDocument();
    const category = screen.getByLabelText(texts.categoryLabel);
    const markSold = screen.getByRole('button', { name: texts.markSold });
    const deleteButton = screen.getByRole('button', { name: texts.deleteForGood });
    expect(category.compareDocumentPosition(deleteButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(deleteButton.compareDocumentPosition(markSold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
