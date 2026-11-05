/** @jest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DescriptionStep from '@/components/marketplace/description-step';
import { describeAdminListing, draftAdminListingText, translateListingText, extendAdminListing, getAdminListing, hideAdminListing, updateAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

jest.mock('@/lib/marketplace/admin.actions', () => ({
  describeAdminListing: jest.fn(),
  draftAdminListingText: jest.fn(),
  translateListingText: jest.fn(),
  retryAdminListing: jest.fn(),
  updateAdminListing: jest.fn(),
  hideAdminListing: jest.fn(),
  markAdminListingSold: jest.fn(),
  publishAdminListing: jest.fn(),
  enableAdminListing: jest.fn(),
  extendAdminListing: jest.fn(),
  setAdminListingEnd: jest.fn(),
  getAdminListing: jest.fn(),
  deleteAdminListing: jest.fn(),
}));
jest.mock('@/lib/marketplace/payment.actions', () => ({ markListingPaid: jest.fn(), recordWhatsAppConsent: jest.fn() }));
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, refresh: jest.fn() }) }));
jest.mock('@/components/marketplace/address-input', () => ({
  __esModule: true,
  default: ({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) => <input id={id} value={value} onChange={(event) => onChange(event.target.value)} />,
}));
jest.mock('@/components/i18n-provider', () => ({ useI18n: () => ({ t: (key: string) => key, locale: 'en' }) }));
jest.mock('@/components/shared/voice-input-button', () => () => null);
jest.mock('@/components/ProductMedia', () => () => null);

// Any text the step shows is just its key, so the buttons can be found by it.
const texts = new Proxy({}, { get: (_, key) => (key === 'missingToPublish' ? 'missing: {items}' : String(key)) }) as AdminTexts;
const mockDescribe = describeAdminListing as jest.Mock;
const mockDraft = draftAdminListingText as jest.Mock;

const listing = {
  id: 'abc',
  type: 'PRODUCT',
  status: 'COLLECTING',
  categories: [],
  rawText: '',
  textMode: 'ai',
  originalTitle: null,
  rawImages: [],
  images: ['https://x.ufs.sh/f/bike.jpg'],
  usesAi: false,
  lastError: null,
  title: null,
  description: null,
  shortTitle: null,
  translations: {},
  price: null,
  priceMode: null,
  createdByAdmin: true,
} as unknown as AdminListing;

// "Crear descripción" already ran.
const drafted = { ...listing, rawText: 'Bici, 80€', categories: ['hogar'], title: 'Bici de paseo', description: 'Bici cómoda.', translations: { en: { title: 'City bike', description: 'Comfy bike.' } } } as AdminListing;

// The workspace's step bar, as plain buttons.
function Steps({ shown = listing }: { shown?: AdminListing }) {
  const [step, setStep] = useState(1);
  return (
    <>
      <button onClick={() => setStep(0)}>stepPhotos</button>
      <button onClick={() => setStep(1)}>stepDetails</button>
      <button onClick={() => setStep(2)}>stepContact</button>
      <button onClick={() => setStep(3)}>stepMore</button>
      <DescriptionStep
        listing={shown}
        languages={[{ id: 'en', label: 'EN' }]}
        shopLanguage={{ id: 'es', label: 'ES' }}
        mercadillos={[]}
        categories={[
          { slug: 'musica', name: 'Música' },
          { slug: 'hogar', name: 'Hogar' },
          { slug: 'deporte', name: 'Deporte' },
        ]}
        listingDays={90}
        maxCategories={2}
        texts={texts}
        onSent={jest.fn()}
        step={step}
        onStep={setStep}
      />
    </>
  );
}

const renderStep = (shown?: AdminListing) => render(<Steps shown={shown} />);
const fillContact = () => {
  fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
  fireEvent.change(screen.getByLabelText('servicePhoneLabel'), { target: { value: ' 612345678 ' } });
  fireEvent.click(screen.getByRole('checkbox'));
};

beforeEach(() => {
  mockDescribe.mockReset();
  mockDraft.mockReset();
});

describe('DescriptionStep', () => {
  it('finishes from any step, naming everything missing and opening the first step it is on', async () => {
    renderStep({ ...listing, images: [] });
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));

    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('missing: missingPicture, missingText, missingPhone, and missingConsent');
    expect(screen.queryByLabelText('servicePhoneLabel')).not.toBeInTheDocument();
    expect(mockDescribe).not.toHaveBeenCalled();
  });

  it('needs some text: the description, or the texts written in the language box', async () => {
    renderStep();

    expect(screen.getByLabelText('titleLabel')).toBeEnabled();
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('missing: missingText');
    expect(mockDescribe).not.toHaveBeenCalled();
  });

  it('publishes the admin\'s own texts, letting the AI translate only the languages left empty', async () => {
    (translateListingText as jest.Mock).mockResolvedValue({ success: true, translations: { en: { title: 'My bike', description: 'Comfy bike.' } } });
    mockDescribe.mockResolvedValue({ success: true });
    renderStep({ ...listing, categories: ['hogar'] } as AdminListing);

    fireEvent.change(screen.getByLabelText('titleLabel'), { target: { value: 'Mi bici' } });
    fireEvent.change(screen.getByLabelText('descriptionLabel'), { target: { value: 'Bici cómoda.' } });
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    await waitFor(() => expect(mockDescribe).toHaveBeenCalled());
    expect(translateListingText).toHaveBeenCalledWith('abc', expect.objectContaining({ title: 'Mi bici', description: 'Bici cómoda.' }));
    expect(mockDraft).not.toHaveBeenCalled();
    expect(mockDescribe).toHaveBeenCalledWith(
      'abc',
      expect.objectContaining({ texts: { es: { title: 'Mi bici', description: 'Bici cómoda.' }, en: { title: 'My bike', description: 'Comfy bike.' } }, categories: ['hogar'] })
    );
  });

  it('lets the AI write every language from "Cuéntamelo todo" when the language box is empty', async () => {
    mockDraft.mockResolvedValue({ success: true, texts: { es: { title: 'Bici', description: 'Bici cómoda.' }, en: { title: 'Bike', description: 'Comfy.' } }, category: 'hogar' });
    mockDescribe.mockResolvedValue({ success: true });
    renderStep();

    fireEvent.change(screen.getByLabelText('tellLabel'), { target: { value: 'bici 80 euros' } });
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    await waitFor(() => expect(mockDescribe).toHaveBeenCalledWith('abc', expect.objectContaining({ categories: ['hogar'], texts: expect.objectContaining({ en: { title: 'Bike', description: 'Comfy.' } }) })));
  });

  it('corrects by default, writes every language on "Crear descripción", and takes the price the AI read', async () => {
    mockDraft.mockResolvedValue({ success: true, texts: { es: { title: 'Bici', description: 'Bici cómoda.' }, en: { title: 'Bike', description: 'Comfy.' } }, priceMode: 'FIXED', price: '80' });
    renderStep();

    expect(screen.getByRole('combobox', { name: 'textModeQuestion' })).toHaveValue('corrected');
    fireEvent.change(screen.getByLabelText('tellLabel'), { target: { value: 'bici 80 euros' } });
    fireEvent.click(screen.getByRole('button', { name: /createDescription/ }));

    await waitFor(() => expect(screen.getByLabelText('titleLabel')).toHaveValue('Bici'));
    expect(mockDraft).toHaveBeenCalledWith('abc', expect.objectContaining({ notes: 'bici 80 euros', textMode: 'corrected', isWanted: false }));
    expect(screen.getByLabelText('titleLabel')).toBeEnabled();
    expect(screen.getByLabelText('priceAmount')).toHaveValue('80');
    fireEvent.click(screen.getByRole('tab', { name: 'EN' }));
    expect(screen.getByLabelText('titleLabel')).toHaveValue('Bike');
  });

  it('takes the category the AI chose into an empty field, lets the admin add another, and publishes both', async () => {
    mockDraft.mockResolvedValue({ success: true, texts: { es: { title: 'Pedal', description: 'Pedal de loops.' }, en: { title: 'Pedal', description: 'Loop pedal.' } }, category: 'musica' });
    mockDescribe.mockResolvedValue({ success: true });
    renderStep();

    fireEvent.change(screen.getByLabelText('tellLabel'), { target: { value: 'pedal looper' } });
    fireEvent.click(screen.getByRole('button', { name: /createDescription/ }));
    await waitFor(() => expect(screen.getByLabelText('categoryLabel')).toHaveTextContent('Música'));
    fireEvent.keyDown(screen.getByLabelText('categoryLabel'), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Hogar' }));
    // The limit is reached: the rest can't be ticked until one is taken off.
    expect(screen.getByRole('menuitemcheckbox', { name: 'Deporte' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    await waitFor(() => expect(mockDescribe).toHaveBeenCalledWith('abc', expect.objectContaining({ categories: ['musica', 'hogar'] })));
  });

  it('publishes the texts as edited, with the number, the name, the OK and the price', async () => {
    mockDescribe.mockResolvedValue({ success: true });
    renderStep(drafted);

    fireEvent.change(screen.getByLabelText('titleLabel'), { target: { value: 'Mi bici' } });
    fireEvent.change(screen.getByLabelText('priceAmount'), { target: { value: '75' } });
    fillContact();
    fireEvent.change(screen.getByLabelText('sellerNameLabel'), { target: { value: 'Lula' } });
    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    await waitFor(() => expect(mockDescribe).toHaveBeenCalled());
    expect(mockDescribe).toHaveBeenCalledWith(
      'abc',
      expect.objectContaining({
        notes: 'Bici, 80€',
        sellerPhone: '612345678',
        sellerName: 'Lula',
        hasConsent: true,
        priceMode: 'FIXED',
        price: '75',
        texts: { es: { title: 'Mi bici', description: 'Bici cómoda.', short: '' }, en: { title: 'City bike', description: 'Comfy bike.' } },
      })
    );
  });

  it('says Ofrezco or Busco on an Anuncio: Busco makes the price "up to" and is sent along', async () => {
    mockDescribe.mockResolvedValue({ success: true });
    renderStep(drafted);

    expect(screen.getByRole('radio', { name: 'offerLabel' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'wantedLabel' }));
    expect(screen.getByLabelText('priceShort')).toHaveValue('UP_TO');
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    await waitFor(() => expect(mockDescribe).toHaveBeenCalledWith('abc', expect.objectContaining({ isWanted: true, priceMode: 'UP_TO' })));
  });

  it('has no Ofrezco or Busco on an event, but its entry, date and place', () => {
    renderStep({ ...listing, type: 'EVENT' } as AdminListing);

    expect(screen.queryByRole('radio', { name: 'wantedLabel' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('priceShort')).not.toBeInTheDocument();
    expect(screen.getByLabelText('eventPrice')).toBeInTheDocument();
    expect(screen.getByLabelText('eventStartsLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('addressLabel')).toBeInTheDocument();
  });

  it('fills an empty date and place from "Crear descripción", and needs the date to publish an event', async () => {
    mockDraft.mockResolvedValue({
      success: true,
      texts: { es: { title: 'Bachata', description: 'Bachata gratis.' }, en: { title: 'Bachata', description: 'Free bachata.' } },
      category: 'musica',
      priceMode: 'FIXED',
      price: '0',
      startsAt: '2026-11-26T19:00',
      address: 'Plaza de Lajares',
    });
    mockDescribe.mockResolvedValue({ success: true });
    renderStep({ ...listing, type: 'EVENT' } as AdminListing);

    fireEvent.change(screen.getByLabelText('tellLabel'), { target: { value: 'Bachata gratis el jueves a las 19h en la plaza de Lajares' } });
    fireEvent.click(screen.getByRole('button', { name: /createDescription/ }));
    await waitFor(() => expect(screen.getByLabelText('eventStartsLabel')).toHaveValue('2026-11-26T19:00'));
    expect(screen.getByLabelText('addressLabel')).toHaveValue('Plaza de Lajares');

    fireEvent.change(screen.getByLabelText('eventStartsLabel'), { target: { value: '' } });
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('missing: missingDate');
    expect(mockDescribe).not.toHaveBeenCalled();
  });

  it('publishes Online until LISTING_DAYS by default, or saves it hidden with its own last day', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-02T10:00:00Z'), doNotFake: ['setTimeout', 'setInterval', 'queueMicrotask'] });
    mockDescribe.mockResolvedValue({ success: true });
    renderStep(drafted);

    fireEvent.click(screen.getByRole('button', { name: /stepMore/ }));
    expect(screen.getByLabelText('statusLabel')).toHaveValue('LIVE');
    expect(screen.getByLabelText('onlineUntilLabel')).toHaveValue('2027-01-31');
    fireEvent.change(screen.getByLabelText('statusLabel'), { target: { value: 'HIDDEN' } });
    fireEvent.change(screen.getByLabelText('onlineUntilLabel'), { target: { value: '2026-12-24' } });
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: /saveHidden/ }));

    await waitFor(() => expect(mockDescribe).toHaveBeenCalledWith('abc', expect.objectContaining({ isHidden: true, onlineUntil: '2026-12-24' })));
    jest.useRealTimers();
  });

  it('shows an event online until its day is over, not as a choice', () => {
    renderStep({ ...listing, type: 'EVENT', startsAt: new Date('2026-11-26T19:00:00Z') } as AdminListing);

    fireEvent.click(screen.getByRole('button', { name: /stepMore/ }));
    expect(screen.getByLabelText('onlineUntilLabel')).toBeDisabled();
    expect(screen.getByText('eventDateFromDescription')).toBeInTheDocument();

    // The date set in Descripción shows here at once.
    fireEvent.click(screen.getByRole('button', { name: /stepDetails/ }));
    fireEvent.change(screen.getByLabelText('eventStartsLabel'), { target: { value: '2026-12-31T22:00' } });
    fireEvent.click(screen.getByRole('button', { name: /stepMore/ }));
    expect(screen.getByLabelText('onlineUntilLabel')).toHaveValue('2026-12-31');
  });

  it('asks for the number and the person\'s OK before publishing', async () => {
    renderStep(drafted);

    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('missing: missingPhone and missingConsent');
    expect(mockDescribe).not.toHaveBeenCalled();
  });

  it('goes back to the description with everything written kept', () => {
    renderStep();

    fireEvent.change(screen.getByLabelText('tellLabel'), { target: { value: 'Bici, 80€' } });
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    fireEvent.change(screen.getByLabelText('sellerNameLabel'), { target: { value: 'Lula' } });
    fireEvent.click(screen.getByRole('button', { name: /stepDetails/ }));

    expect(screen.getByLabelText('tellLabel')).toHaveValue('Bici, 80€');
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    expect(screen.getByLabelText('sellerNameLabel')).toHaveValue('Lula');
  });

  it('fills the WhatsApp with the number written in the description, unless one is already there', () => {
    renderStep();

    fireEvent.change(screen.getByLabelText('tellLabel'), { target: { value: 'Concierto a las 20:00. Info: 628 111 222' } });
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    expect(screen.getByLabelText('servicePhoneLabel')).toHaveValue('628 111 222');

    fireEvent.change(screen.getByLabelText('servicePhoneLabel'), { target: { value: '699 000 000' } });
    fireEvent.click(screen.getByRole('button', { name: /stepDetails/ }));
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    expect(screen.getByLabelText('servicePhoneLabel')).toHaveValue('699 000 000');
  });

  it('leaves the WhatsApp empty when the description has no number', () => {
    renderStep();

    fireEvent.change(screen.getByLabelText('tellLabel'), { target: { value: 'Bici, 180 euros' } });
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));

    expect(screen.getByLabelText('servicePhoneLabel')).toHaveValue('');
  });

  describe('an existing listing', () => {
    const live = {
      ...drafted,
      status: 'LIVE',
      consentAt: new Date('2026-10-01'),
      sellerName: 'Lula',
      seller: { waId: '34612345678', name: 'Lula' },
      expiresAt: new Date('2026-12-24T23:00:00Z'),
      product: { slug: 'bici-de-paseo-abc123' },
    } as unknown as AdminListing;

    it('is saved, not published, with the states that fit, "Prolongar 1 mes" and delete in Más', () => {
      renderStep(live);

      expect(screen.getByRole('button', { name: /saveChanges/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /stepMore/ }));
      expect([...screen.getByLabelText('statusLabel').querySelectorAll('option')].map((option) => option.value)).toEqual(['LIVE', 'HIDDEN', 'SOLD']);
      expect(screen.getByLabelText('onlineUntilLabel')).toHaveValue('2026-12-24');
      expect(screen.getByRole('button', { name: /extendMonth/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /deleteListing/ })).toBeInTheDocument();
    });

    it('moves the end a month on with "Prolongar 1 mes"', async () => {
      (extendAdminListing as jest.Mock).mockResolvedValue({ success: true, message: '' });
      (getAdminListing as jest.Mock).mockResolvedValue({ ...live, expiresAt: new Date('2027-01-24T23:00:00Z') });
      renderStep(live);

      fireEvent.click(screen.getByRole('button', { name: /stepMore/ }));
      fireEvent.click(screen.getByRole('button', { name: /extendMonth/ }));

      await waitFor(() => expect(screen.getByLabelText('onlineUntilLabel')).toHaveValue('2027-01-24'));
    });

    it('saves the edits, hides it when Oculto is chosen, and shows it as visitors would', async () => {
      (updateAdminListing as jest.Mock).mockResolvedValue({ success: true, message: 'Guardado' });
      (hideAdminListing as jest.Mock).mockResolvedValue({ success: true, message: '' });
      (getAdminListing as jest.Mock).mockResolvedValue({ ...live, status: 'HIDDEN' });
      renderStep(live);

      fireEvent.change(screen.getByLabelText('titleLabel'), { target: { value: 'Bici azul' } });
      fireEvent.click(screen.getByRole('button', { name: /stepMore/ }));
      fireEvent.change(screen.getByLabelText('statusLabel'), { target: { value: 'HIDDEN' } });
      fireEvent.click(screen.getByRole('button', { name: /saveChanges/ }));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/product/vista-abc'));
      expect(updateAdminListing).toHaveBeenCalledWith('abc', expect.objectContaining({ title: 'Bici azul', categories: ['hogar'], sellerPhone: '+34612345678' }));
      expect(updateAdminListing).not.toHaveBeenCalledWith('abc', expect.objectContaining({ sellerName: expect.anything() }));
      expect(hideAdminListing).toHaveBeenCalledWith('abc');
    });

    it('shows the name in use and saves it once changed', async () => {
      renderStep(live as AdminListing);
      fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));

      const name = screen.getByLabelText('sellerNameLabel');
      expect(name).toHaveValue('Lula');
      expect(name).not.toHaveAttribute('readonly');
      fireEvent.change(name, { target: { value: 'Ana' } });
      fireEvent.click(screen.getByRole('button', { name: /saveChanges/ }));

      await waitFor(() => expect(updateAdminListing).toHaveBeenCalledWith('abc', expect.objectContaining({ sellerName: 'Ana' })));
    });
  });
});
