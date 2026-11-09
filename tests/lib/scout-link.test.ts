/** @jest-environment node */
import { NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import { GET } from '@/app/s/[code]/route';

jest.mock('@/db/prisma', () => ({ prisma: { scout: { findUnique: jest.fn() } } }));
jest.mock('@/lib/constants', () => ({ APP_NAME: 'Baifo', SERVER_URL: 'https://baifo.es' }));
jest.mock('@/lib/brand', () => ({
  BRAND: { contact: { sellWhatsappUrl: (text: string) => `https://api.whatsapp.com/send?phone=34600000555&text=${encodeURIComponent(text)}` } },
}));
jest.mock('@/lib/i18n-server', () => ({
  getT: async () => ({ t: (key: string, values: Record<string, string>) => `${key} ${JSON.stringify(values)}` }),
}));

const findScout = (prisma as unknown as { scout: { findUnique: jest.Mock } }).scout.findUnique;
const open = (code: string, userAgent = 'Mozilla/5.0') =>
  GET(new NextRequest(`http://localhost:3000/s/${code}`, { headers: { 'user-agent': userAgent } }), { params: Promise.resolve({ code }) });
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

  it("shows WhatsApp's preview their photo and name instead of following the redirect", async () => {
    findScout.mockResolvedValue({ name: 'Ana <3', code: 'ana', image: 'https://abc.ufs.sh/f/ana.jpg' });
    const response = await open('ana', 'WhatsApp/2.24.1 A');
    const html = await response.text();

    expect(response.status).toBe(200);
    // Small and square through our own address: WhatsApp skips a phone photo of several MB.
    expect(html).toContain('<meta property="og:image" content="https://baifo.es/s/ana/preview.jpg?v=ana.jpg">');
    expect(html).toContain('SCOUT_LINK_TITLE {&#34;shop&#34;:&#34;Baifo&#34;,&#34;name&#34;:&#34;Ana &#60;3&#34;}');
  });

  it('still opens WhatsApp for a person, and for previews of señaladores without a photo', async () => {
    findScout.mockResolvedValue({ name: 'Ana', code: 'ana', image: 'https://abc.ufs.sh/f/ana.jpg' });
    expect((await open('ana')).status).toBe(307);

    findScout.mockResolvedValue({ name: 'Ana', code: 'ana', image: null });
    expect((await open('ana', 'WhatsApp/2.24.1 A')).status).toBe(307);
  });
});
