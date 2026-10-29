/** @jest-environment node */
import { renderToStaticMarkup } from 'react-dom/server';
import { prisma } from '@/db/prisma';
import { emailService } from '@/email';
import { sendListingsEmail } from '@/lib/marketplace/listings-email';

jest.mock('@/db/prisma', () => ({ prisma: { product: { findMany: jest.fn() } } }));
jest.mock('@/email', () => ({
  ...jest.requireActual('@/email'),
  emailService: { send: jest.fn(async () => ({ success: true, id: 'email-1' })) },
}));
jest.mock('@/lib/marketplace/settings', () => ({
  getMarketplaceSettings: jest.fn(async () => ({ listingsEmail: 'tablon@example.com', sendOnPublish: true })),
}));

const PRODUCT = { name: 'Bici', images: [], price: { toString: () => '70.00' }, priceMax: null, type: 'PRODUCT', contactPhone: '34600111222', expiresAt: null };

beforeEach(() => {
  (prisma.product.findMany as jest.Mock).mockResolvedValue([
    { ...PRODUCT, slug: 'bici-abcdef' },
    { ...PRODUCT, slug: 'mesa-123456' },
  ]);
});

test('attaches one inline QR PNG per listing and shows it by cid', async () => {
  await sendListingsEmail({ isAutomatic: false });

  const message = (emailService.send as jest.Mock).mock.calls[0][0];
  expect(message.attachments).toEqual([
    expect.objectContaining({ filename: 'qr-bici-abcdef.png', contentType: 'image/png', inlineContentId: 'qr-bici-abcdef' }),
    expect.objectContaining({ filename: 'qr-mesa-123456.png', contentType: 'image/png', inlineContentId: 'qr-mesa-123456' }),
  ]);
  // PNG signature: a real image, not a data: URI.
  expect(message.attachments[0].content.subarray(0, 4).toString('hex')).toBe('89504e47');

  const html = renderToStaticMarkup(message.react);
  expect(html).toContain('src="cid:qr-bici-abcdef"');
  expect(html).toContain('src="cid:qr-mesa-123456"');
  expect(html).not.toContain('data:image');
});
