import sitemap from '@/app/sitemap';
import { getInStockSlugs } from '@/components/shared/home/in-stock-rings';

jest.mock('@/components/shared/home/in-stock-rings', () => ({ getInStockSlugs: jest.fn() }));
jest.mock('@/lib/constants', () => ({ SERVER_URL: 'https://baifo.es' }));
jest.mock('@/lib/seo', () => ({ languageAlternates: (path: string) => ({ es: path, en: `${path}${path.includes('?') ? '&' : '?'}lang=en` }) }));

describe('sitemap', () => {
  it('lists the home, the feed and every listing in the shop, and no category pages', async () => {
    (getInStockSlugs as jest.Mock).mockResolvedValue([{ slug: 'guitarra', createdAt: new Date('2026-11-01') }]);
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toEqual(['https://baifo.es/', 'https://baifo.es/explore', 'https://baifo.es/product/guitarra']);
    expect(urls.join(' ')).not.toMatch(/categor/);
  });
});
