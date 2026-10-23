import { prisma } from '@/db/prisma';
import { sendReservationAlert } from '@/email';
import { alertOwnerOfRing } from '@/lib/owner-alerts';
import { sendWhatsApp } from '@/lib/whatsapp';

jest.mock('@/db/prisma', () => ({ prisma: { shopSettings: { findUnique: jest.fn() } } }));
jest.mock('@/email', () => ({
  sendReservationAlert: jest.fn(),
  sendOrderAlert: jest.fn(),
  formatReservationEnd: jest.fn(() => 'Friday'),
}));
jest.mock('@/lib/whatsapp', () => ({ sendWhatsApp: jest.fn().mockResolvedValue({ success: true }) }));

const findSettings = (prisma as unknown as { shopSettings: { findUnique: jest.Mock } }).shopSettings.findUnique;

const ALERT = {
  product: { name: 'Lava', slug: 'lava', images: ['/uploads/lava.jpg'] },
  customer: { name: 'Ana', whatsapp: '+34 600 11 22 33', contact: 'whatsapp: +34 600 11 22 33', message: 'Size 54?' },
};

const SETTINGS = { notifyEmail: true, alertEmails: '', notifyWhatsapp: false, whatsappNumber: '', whatsappApiKey: '' };

describe('alertOwnerOfRing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only emails while no settings were saved', async () => {
    findSettings.mockResolvedValue(null);
    await alertOwnerOfRing(ALERT);
    expect(sendReservationAlert).toHaveBeenCalledTimes(1);
    expect(sendWhatsApp).not.toHaveBeenCalled();
  });

  it('sends the owner a WhatsApp with the photo, the ring and a reply link', async () => {
    findSettings.mockResolvedValue({ ...SETTINGS, notifyEmail: false, notifyWhatsapp: true, whatsappNumber: '+34 699', whatsappApiKey: 'key' });
    await alertOwnerOfRing(ALERT);
    expect(sendReservationAlert).not.toHaveBeenCalled();
    const { phone, apiKey, text } = (sendWhatsApp as jest.Mock).mock.calls[0][0];
    expect({ phone, apiKey }).toEqual({ phone: '+34 699', apiKey: 'key' });
    expect(text).toContain('Ana');
    expect(text).toContain('Size 54?');
    expect(text).toContain('https://wa.me/34600112233');
    expect(text).toMatch(/https?:\/\/[^\s]+\/uploads\/lava\.jpg/);
    expect(text).toMatch(/https?:\/\/[^\s]+\/product\/lava/);
  });

  it('emails the addresses the admin entered', async () => {
    findSettings.mockResolvedValue({ ...SETTINGS, alertEmails: 'a@x.com, b@x.com' });
    await alertOwnerOfRing(ALERT);
    expect(sendReservationAlert).toHaveBeenCalledWith(expect.objectContaining({ to: ['a@x.com', 'b@x.com'] }));
  });

  it('still emails when the settings table is missing', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    findSettings.mockRejectedValue(new Error('relation "ShopSettings" does not exist'));
    await alertOwnerOfRing(ALERT);
    expect(sendReservationAlert).toHaveBeenCalledTimes(1);
  });
});
