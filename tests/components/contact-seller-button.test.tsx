/** @jest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactSellerButton from '@/components/shared/product/contact-seller-button';
import { getProductContact } from '@/lib/actions/product.actions';
import { NICKNAME_STORAGE_KEY } from '@/lib/contact-message';
import { renderWithI18n, t } from '../utils/render-with-i18n';

jest.mock('@/lib/actions/product.actions', () => ({ getProductContact: jest.fn() }));

const mockContact = getProductContact as jest.Mock;
const PRODUCT_ID = '6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60';
const MESSAGE_TEXTS = {
  hello: '¡Hola!',
  helloNamed: '¡Hola! Soy {nick}',
  body: '{hello} 👋 Te escribo por tu anuncio «Bici de paseo» en Baifo: https://baifo.es/product/bici',
};

const renderButton = () => renderWithI18n(<ContactSellerButton productId={PRODUCT_ID} messageTexts={MESSAGE_TEXTS} />);
const messageOf = (link: HTMLElement) => new URL(link.getAttribute('href') ?? '').searchParams.get('text');

describe('ContactSellerButton', () => {
  beforeEach(() => localStorage.clear());

  it('opens a pop-up and writes on WhatsApp with the nickname, which it remembers', async () => {
    mockContact.mockResolvedValue({ phone: '+34600111222', whatsappUrl: 'https://wa.me/34600111222' });
    renderButton();

    expect(screen.queryByText('+34600111222')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('CONTACT_SELLER') }));
    expect(mockContact).toHaveBeenCalledWith(PRODUCT_ID);

    expect(await screen.findByRole('link', { name: '+34600111222' })).toHaveAttribute('href', 'tel:+34600111222');
    await userEvent.type(screen.getByLabelText(t('CONTACT_NICKNAME')), 'Lula');
    const whatsapp = screen.getByRole('link', { name: t('CONTACT_SELLER_WHATSAPP') });
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/34600111222\?text=/);
    expect(messageOf(whatsapp)).toBe('¡Hola! Soy Lula 👋 Te escribo por tu anuncio «Bici de paseo» en Baifo: https://baifo.es/product/bici');

    await userEvent.click(whatsapp);
    expect(localStorage.getItem(NICKNAME_STORAGE_KEY)).toBe('Lula');
  });

  it('fills in the remembered nickname, and skipping writes without it', async () => {
    localStorage.setItem(NICKNAME_STORAGE_KEY, 'Lula');
    mockContact.mockResolvedValue({ phone: '+34600111222', whatsappUrl: 'https://wa.me/34600111222' });
    renderButton();

    await userEvent.click(screen.getByRole('button', { name: t('CONTACT_SELLER') }));

    expect(screen.getByLabelText(t('CONTACT_NICKNAME'))).toHaveValue('Lula');
    const skip = await screen.findByRole('link', { name: t('CONTACT_SKIP') });
    expect(messageOf(skip)).toBe('¡Hola! 👋 Te escribo por tu anuncio «Bici de paseo» en Baifo: https://baifo.es/product/bici');
  });

  it('says so when the seller has no number anymore', async () => {
    mockContact.mockResolvedValue(null);
    renderButton();

    await userEvent.click(screen.getByRole('button', { name: t('CONTACT_SELLER') }));

    expect(await screen.findByText(t('CONTACT_SELLER_UNAVAILABLE'))).toBeInTheDocument();
  });

  it('asks to try again later when there were too many requests, and shows no number', async () => {
    mockContact.mockResolvedValue({ isRateLimited: true });
    renderButton();

    await userEvent.click(screen.getByRole('button', { name: t('CONTACT_SELLER') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('CONTACT_SELLER_TOO_MANY'));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('CONTACT_SELLER') })).toBeEnabled();
  });
});
