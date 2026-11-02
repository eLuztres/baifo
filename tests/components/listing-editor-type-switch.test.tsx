/** @jest-environment jsdom */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingEditor from '@/components/marketplace/listing-editor';
import { publishAdminListing, updateAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import type { Locale } from '@/lib/i18n-core';
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
  shareAdminListing: jest.fn(),
  translateListingText: jest.fn(),
  updateAdminListing: jest.fn(),
}));
jest.mock('@/lib/uploadthing', () => ({ useUploadThing: () => ({ startUpload: jest.fn() }) }));
jest.mock('@/lib/video-upload', () => ({ uploadVideos: jest.fn() }));
jest.mock('@/lib/prepare-photos', () => ({ preparePhotos: jest.fn() }));
jest.mock('@/lib/marketplace/payment.actions', () => ({ markListingPaid: jest.fn(), recordWhatsAppConsent: jest.fn() }));
jest.mock('@/components/marketplace/address-input', () => ({
  __esModule: true,
  default: ({ id }: { id: string }) => <input id={id} />,
}));

const LOCALES: Locale[] = ['es', 'en', 'it', 'fr', 'de'];
const mockUpdate = updateAdminListing as jest.Mock;
const mockPublish = publishAdminListing as jest.Mock;

const LISTING = {
  id: 'listing-1',
  status: 'LIVE',
  type: 'PRODUCT',
  title: 'Boss RC-500',
  shortTitle: null,
  description: 'Pedal de loops',
  translations: {},
  category: 'music',
  condition: null,
  price: '200.00',
  priceMode: 'FIXED',
  images: ['https://utfs.io/f/a.jpg'],
  rawImages: [],
  aiImages: [],
  rawText: '',
  placeId: null,
  serviceType: null,
  startsAt: null,
  address: null,
  plan: 'normal',
  paidAt: null,
  textMode: 'ai',
  seller: { waId: 'house', name: null },
  product: { slug: 'boss-rc-500' },
  planPrices: { normal: '5.00', big: '10.00' },
} as unknown as AdminListing;

const renderEditor = (listing: Partial<AdminListing> = {}, locale: Locale = 'es') =>
  renderWithI18n(
    <ListingEditor
      listing={{ ...LISTING, ...listing } as AdminListing}
      categories={[{ slug: 'music', name: 'Música' }]}
      places={[]}
      languages={[]}
      shopLanguage={{ id: 'es', label: 'ES' }}
      texts={adminTexts(locale)}
      onPublished={jest.fn()}
    />,
  );

const switchTo = (label: string) => userEvent.click(screen.getByRole('radio', { name: label }));
const chooseKind = (texts: ReturnType<typeof adminTexts>, label: string) => userEvent.selectOptions(screen.getByLabelText(texts.typeLabel, { selector: 'select' }), label);
const lastEdit = () => mockUpdate.mock.calls.at(-1)[1];

beforeEach(() => {
  mockUpdate.mockReset().mockResolvedValue({ success: true, message: 'Guardado' });
  mockPublish.mockReset().mockResolvedValue({ success: true, message: 'Publicado' });
});

describe('ListingEditor type switch', () => {
  it.each(LOCALES)('offers an Anuncio and an event and saves the chosen one (%s)', async (locale) => {
    const texts = adminTexts(locale);
    renderEditor({}, locale);

    const group = screen.getByRole('radiogroup', { name: texts.typeLabel });
    expect(within(group).getAllByRole('radio').map((radio) => radio.textContent?.trim())).toEqual([texts.type_AD, texts.type_EVENT]);
    expect(screen.getByRole('radio', { name: texts.type_AD })).toHaveAttribute('aria-checked', 'true');

    await switchTo(texts.type_EVENT);
    expect(screen.getByLabelText(texts.eventStartsLabel)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: texts.saveNow }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(lastEdit()).toMatchObject({ type: 'EVENT', title: 'Boss RC-500', price: '200.00' });
  });

  it('shows what it is and one price choice on an Anuncio, the price choice following the kind', async () => {
    const texts = adminTexts('es');
    renderEditor();

    expect(screen.getByLabelText(texts.typeLabel, { selector: 'select' })).toHaveValue('PRODUCT');
    expect(screen.getByLabelText(texts.priceShort)).toHaveValue('FIXED');
    expect(screen.getByLabelText(texts.priceAmount)).toHaveValue('200.00');

    await chooseKind(texts, texts.type_WANTED);
    expect(screen.getByLabelText(texts.priceShort)).toHaveValue('UP_TO');
    await chooseKind(texts, texts.type_SERVICE);
    expect(screen.getByLabelText(texts.priceShort)).toHaveValue('FROM');

    await switchTo(texts.type_EVENT);
    expect(screen.getByLabelText(texts.eventStartsLabel)).toBeInTheDocument();
    expect(screen.queryByLabelText(texts.typeLabel, { selector: 'select' })).not.toBeInTheDocument();

    await switchTo(texts.type_AD);
    await chooseKind(texts, texts.type_PRODUCT);
    expect(screen.getByLabelText(texts.priceShort)).toHaveValue('FIXED');
    // Back where it started: nothing to save.
    expect(screen.getByRole('button', { name: texts.saveNow })).toBeDisabled();
  });

  it('hides the amount for "no price" and sends none', async () => {
    const texts = adminTexts('es');
    renderEditor();

    await userEvent.selectOptions(screen.getByLabelText(texts.priceShort), texts.priceMode_NONE);
    expect(screen.queryByLabelText(texts.priceAmount)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: texts.saveNow }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(lastEdit()).toMatchObject({ priceMode: 'NONE', price: '' });
  });

  it('lets an event start free, and takes that 0 back when it is an Anuncio again', async () => {
    const texts = adminTexts('es');
    renderEditor({ type: 'SERVICE', price: null, priceMode: 'FROM' });

    await switchTo(texts.type_EVENT);
    expect(screen.getByLabelText(texts.eventPrice)).toHaveValue('0');

    await switchTo(texts.type_AD);
    await chooseKind(texts, texts.type_SERVICE);
    expect(screen.getByLabelText(texts.priceAmount)).toHaveValue('');
    expect(screen.getByRole('button', { name: texts.saveNow })).toBeDisabled();

    await userEvent.type(screen.getByLabelText(texts.priceAmount), '25');
    await userEvent.click(screen.getByRole('button', { name: texts.saveNow }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(lastEdit()).toMatchObject({ type: 'SERVICE', price: '25', priceMode: 'FROM' });
    expect(lastEdit()).not.toHaveProperty('condition');
  });

  it('asks first on a live listing that is paid, and changes nothing on cancel', async () => {
    const texts = adminTexts('es');
    renderEditor({ paidAt: new Date('2026-10-01') });

    await switchTo(texts.type_EVENT);
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(texts.changeTypeConfirm);
    await userEvent.click(within(dialog).getByRole('button', { name: texts.changeTypeCancel }));
    expect(screen.getByRole('radio', { name: texts.type_AD })).toHaveAttribute('aria-checked', 'true');

    await switchTo(texts.type_EVENT);
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: texts.type_EVENT }));
    expect(screen.getByRole('radio', { name: texts.type_EVENT })).toHaveAttribute('aria-checked', 'true');
  });

  it('switches a listing in review without asking, and publishes it as the new kind', async () => {
    const texts = adminTexts('es');
    renderEditor({ status: 'IN_REVIEW', product: null, paidAt: null });

    await chooseKind(texts, texts.type_WANTED);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(texts.publishNow) }));

    await waitFor(() => expect(mockPublish).toHaveBeenCalled());
    expect(lastEdit()).toMatchObject({ type: 'WANTED' });
  });
});
