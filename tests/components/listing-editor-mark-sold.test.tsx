/** @jest-environment jsdom */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingEditor from '@/components/marketplace/listing-editor';
import { markAdminListingSold, updateAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { renderWithI18n } from '../utils/render-with-i18n';

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
// The upload button pulls in UploadThing, which needs browser APIs jsdom lacks.
jest.mock('@/components/marketplace/photo-upload', () => () => null);
jest.mock('@/lib/marketplace/payment.actions', () => ({ markListingPaid: jest.fn(), markRenewalPaid: jest.fn(), recordWhatsAppConsent: jest.fn() }));

const texts = adminTexts('es');
const mockSold = markAdminListingSold as jest.Mock;
const mockUpdate = updateAdminListing as jest.Mock;

const listing = {
  id: 'listing-1',
  status: 'LIVE',
  type: 'ITEM',
  title: 'Boss RC-500',
  shortTitle: null,
  description: 'Pedal de loops',
  translations: {},
  category: 'music',
  condition: 'GOOD',
  price: '200.00',
  priceMax: null,
  images: ['https://utfs.io/f/a.jpg'],
  rawImages: [],
  aiImages: [],
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

async function openConfirm() {
  await userEvent.click(screen.getByRole('button', { name: texts.markSold }));
  return screen.findByRole('alertdialog');
}

describe('ListingEditor "Mark as sold"', () => {
  beforeEach(() => {
    mockSold.mockReset().mockResolvedValue({ success: true, message: 'Vendido' });
    mockUpdate.mockReset().mockResolvedValue({ success: true, message: '' });
  });

  it('asks first instead of marking the listing sold at once', async () => {
    renderEditor();

    const dialog = await openConfirm();

    expect(dialog).toHaveTextContent(texts.markSoldConfirm);
    expect(mockSold).not.toHaveBeenCalled();
  });

  it('keeps the listing live on cancel', async () => {
    renderEditor();

    await openConfirm();
    await userEvent.click(screen.getByRole('button', { name: texts.markSoldCancel }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mockSold).not.toHaveBeenCalled();
  });

  it('saves the edits first, then marks it sold on confirm', async () => {
    renderEditor();

    const dialog = await openConfirm();
    await userEvent.click(within(dialog).getByRole('button', { name: texts.markSold }));

    await waitFor(() => expect(mockSold).toHaveBeenCalledWith('listing-1'));
    expect(mockUpdate.mock.invocationCallOrder[0]).toBeLessThan(mockSold.mock.invocationCallOrder[0]);
  });
});
