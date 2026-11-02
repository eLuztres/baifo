/** @jest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactSellerButton from '@/components/shared/product/contact-seller-button';
import { getProductContact } from '@/lib/actions/product.actions';
import { whatsappAppUrl, whatsappLinkUrl, whatsappWebUrl } from '@/lib/whatsapp-chat';
import { renderWithI18n, t } from '../utils/render-with-i18n';

jest.mock('@/lib/actions/product.actions', () => ({ getProductContact: jest.fn() }));

const mockContact = getProductContact as jest.Mock;
const PRODUCT_ID = '6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60';
const MESSAGE = '¡Hola! Te escribo por tu anuncio «Bici de paseo» en Baifo: https://baifo.es/product/bici';

const chat = { opener: {}, location: { href: '' }, close: jest.fn() };
const renderButton = () => renderWithI18n(<ContactSellerButton productId={PRODUCT_ID} message={MESSAGE} />);
const tapContact = () => userEvent.click(screen.getByRole('button', { name: t('CONTACT_SELLER') }));

describe('ContactSellerButton', () => {
  beforeEach(() => {
    chat.opener = {};
    chat.location.href = '';
    chat.close.mockClear();
    jest.spyOn(window, 'open').mockReturnValue(chat as unknown as Window);
  });

  it('on a computer goes straight to WhatsApp Web with the message written, asking for nothing', async () => {
    mockContact.mockResolvedValue({ whatsappUrl: 'https://wa.me/34600111222' });
    renderButton();

    await tapContact();

    expect(mockContact).toHaveBeenCalledWith(PRODUCT_ID);
    await waitFor(() => expect(chat.location.href).toMatch(/^https:\/\/web\.whatsapp\.com\/send\?phone=34600111222&text=/));
    expect(new URL(chat.location.href).searchParams.get('text')).toBe(MESSAGE);
    expect(chat.opener).toBeNull();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('on a phone opens no tab, so none is left behind', async () => {
    const userAgent = jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); // jsdom can't navigate
    mockContact.mockResolvedValue({ whatsappUrl: 'https://wa.me/34600111222' });
    renderButton();

    await tapContact();

    await waitFor(() => expect(mockContact).toHaveBeenCalledWith(PRODUCT_ID));
    expect(window.open).not.toHaveBeenCalled();
    userAgent.mockRestore();
    consoleError.mockRestore();
  });

  it('builds a chat link for the app, for WhatsApp Web and for anywhere else', () => {
    expect(whatsappAppUrl('34600', 'Hola y\nadiós')).toBe('whatsapp://send?phone=34600&text=Hola%20y%0Aadi%C3%B3s');
    expect(whatsappWebUrl('34600', 'Hola')).toBe('https://web.whatsapp.com/send?phone=34600&text=Hola');
    expect(whatsappLinkUrl('34600', 'Hola')).toBe('https://wa.me/34600?text=Hola');
  });

  it('says so when the seller has no number anymore', async () => {
    mockContact.mockResolvedValue(null);
    renderButton();

    await tapContact();

    expect(await screen.findByText(t('CONTACT_SELLER_UNAVAILABLE'))).toBeInTheDocument();
    expect(chat.close).toHaveBeenCalled();
  });

  it('asks to try again later when there were too many requests', async () => {
    mockContact.mockResolvedValue({ isRateLimited: true });
    renderButton();

    await tapContact();

    expect(await screen.findByRole('alert')).toHaveTextContent(t('CONTACT_SELLER_TOO_MANY'));
    expect(chat.close).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: t('CONTACT_SELLER') })).toBeEnabled());
  });
});
