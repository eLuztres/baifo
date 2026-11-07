/** @jest-environment node */
import { NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import { GET } from '@/app/s/[code]/route';

jest.mock('@/db/prisma', () => ({ prisma: { scout: { findUnique: jest.fn() } } }));
jest.mock('@/lib/constants', () => ({ APP_NAME: 'Baifo' }));
jest.mock('@/lib/brand', () => ({
  BRAND: { contact: { sellWhatsappUrl: (text: string) => `https://api.whatsapp.com/send?phone=34600000555&text=${encodeURIComponent(text)}` } },
}));
jest.mock('@/lib/i18n-server', () => ({
  getT: async () => ({ t: (key: string, values: Record<string, string>) => `${key} ${JSON.stringify(values)}` }),
}));

const findScout = (prisma as unknown as { scout: { findUnique: jest.Mock } }).scout.findUnique;
const open = (code: string) => GET(new NextRequest(`http://localhost:3000/s/${code}`), { params: Promise.resolve({ code }) });
const textOf = (response: Response) => new URL(response.headers.get('location') ?? '').searchParams.get('text');

describe('a señalador link', () => {
  it('opens the shop WhatsApp with their name and code in the message', async () => {
    findScout.mockResolvedValue({ name: 'Ana', code: 'ana' });
    const response = await open('ANA');

    expect(findScout).toHaveBeenCalledWith(expect.objectContaining({ where: { code: 'ana' } }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('phone=34600000555');
    expect(textOf(response)).toBe('SCOUT_WHATSAPP_MESSAGE {"shop":"Baifo","name":"Ana","code":"ana"}');
  });

  it('still opens WhatsApp, with the usual message, for an unknown or deleted code', async () => {
    findScout.mockResolvedValue(null);

    expect(textOf(await open('nobody'))).toBe('SELL_WHATSAPP_MESSAGE {"shop":"Baifo"}');
  });
});
