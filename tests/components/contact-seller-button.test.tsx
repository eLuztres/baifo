/** @jest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactSellerButton from '@/components/shared/product/contact-seller-button';
import { getProductContact } from '@/lib/actions/product.actions';
import { renderWithI18n, t } from '../utils/render-with-i18n';

jest.mock('@/lib/actions/product.actions', () => ({ getProductContact: jest.fn() }));

const mockContact = getProductContact as jest.Mock;
const PRODUCT_ID = '6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60';

describe('ContactSellerButton', () => {
  it('shows the number only after a click, with a prefilled WhatsApp message', async () => {
    mockContact.mockResolvedValue({ phone: '+34600111222', whatsappUrl: 'https://wa.me/34600111222' });
    renderWithI18n(<ContactSellerButton productId={PRODUCT_ID} productName='Bici de paseo' />);

    expect(screen.queryByText('+34600111222')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('CONTACT_SELLER') }));

    expect(mockContact).toHaveBeenCalledWith(PRODUCT_ID);
    expect(await screen.findByRole('link', { name: '+34600111222' })).toHaveAttribute('href', 'tel:+34600111222');
    const whatsapp = screen.getByRole('link', { name: t('CONTACT_SELLER_WHATSAPP') });
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/34600111222\?text=.*Bici%20de%20paseo/);
  });

  it('says so when the seller has no number anymore', async () => {
    mockContact.mockResolvedValue(null);
    renderWithI18n(<ContactSellerButton productId={PRODUCT_ID} productName='Bici de paseo' />);

    await userEvent.click(screen.getByRole('button', { name: t('CONTACT_SELLER') }));

    expect(await screen.findByText(t('CONTACT_SELLER_UNAVAILABLE'))).toBeInTheDocument();
  });

  it('asks to try again later when there were too many requests, and shows no number', async () => {
    mockContact.mockResolvedValue({ isRateLimited: true });
    renderWithI18n(<ContactSellerButton productId={PRODUCT_ID} productName='Bici de paseo' />);

    await userEvent.click(screen.getByRole('button', { name: t('CONTACT_SELLER') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('CONTACT_SELLER_TOO_MANY'));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('CONTACT_SELLER') })).toBeEnabled();
  });
});
