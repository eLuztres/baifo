import sitemap from '@/app/sitemap';
import { getInStockSlugs } from '@/components/shared/home/in-stock-rings';

jest.mock('@/components/shared/home/in-stock-rings', () => ({ getInStockSlugs: jest.fn() }));
jest.mock('@/lib/partners', () => ({ getPartners: async () => [{ slug: 'magma' }], partnerPath: (slug: string) => `/mercadillo/${slug}` }));
jest.mock('@/lib/constants', () => ({ SERVER_URL: 'https://baifo.es' }));
jest.mock('@/lib/seo', () => ({ languageAlternates: (path: string) => ({ es: path, en: `${path}${path.includes('?') ? '&' : '?'}lang=en` }) }));

describe('sitemap', () => {
  it('lists the home, the feed, every partner\'s mercadillo and every listing in the shop, and no category pages', async () => {
    (getInStockSlugs as jest.Mock).mockResolvedValue([{ slug: 'guitarra', createdAt: new Date('2026-11-01') }]);
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toEqual(['https://baifo.es/', 'https://baifo.es/explore', 'https://baifo.es/mercadillo/magma', 'https://baifo.es/product/guitarra']);
    expect(urls.join(' ')).not.toMatch(/categor/);
  });
});
