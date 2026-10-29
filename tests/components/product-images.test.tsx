/** @jest-environment jsdom */
import { fireEvent, screen } from '@testing-library/react';
import ProductImages from '@/components/shared/product/product-images';
import { playFullScreen } from '@/lib/video-full-screen';
import { renderWithI18n, t } from '../utils/render-with-i18n';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
jest.mock('@/lib/video-full-screen', () => ({ playFullScreen: jest.fn() }));
jest.mock('@/components/shared/image-lightbox', () => ({
  __esModule: true,
  default: ({ index }: { index: number | null }) => (index === null ? null : <div role='dialog' aria-label={`viewer ${index}`} />),
}));

const IMAGES = ['/surf.mp4', '/board.jpg'];
const mockPlayFullScreen = playFullScreen as jest.MockedFunction<typeof playFullScreen>;

beforeAll(() => {
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia;
});

// The phone grid comes first in the page, before the desktop thumbnails with the same labels.
const phoneTile = (n: number) => screen.getAllByRole('button', { name: t('SHOW_IMAGE', { n }) })[0];

describe('ProductImages phone grid', () => {
  it('loads the videos only once they are on screen, never all at once', () => {
    const { container } = renderWithI18n(<ProductImages images={IMAGES} alt='Paddle surf' />);

    const players = [...container.querySelectorAll('video')].filter((video) => !video.src.includes('#t='));
    expect(players.length).toBeGreaterThan(0);
    players.forEach((video) => {
      expect(video).toHaveAttribute('preload', 'none');
      expect(video).not.toHaveAttribute('autoplay');
    });
  });

  it('puts the tapped video tile itself in full screen instead of opening the viewer', () => {
    mockPlayFullScreen.mockReturnValue(true);
    renderWithI18n(<ProductImages images={IMAGES} alt='Paddle surf' />);

    const tile = phoneTile(1);
    fireEvent.click(tile);

    expect(mockPlayFullScreen).toHaveBeenCalledWith(tile.querySelector('video'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the viewer when the browser cannot show the video full screen', () => {
    mockPlayFullScreen.mockReturnValue(false);
    renderWithI18n(<ProductImages images={IMAGES} alt='Paddle surf' />);

    fireEvent.click(phoneTile(1));

    expect(screen.getByRole('dialog', { name: 'viewer 0' })).toBeInTheDocument();
  });

  it('opens the viewer for a photo tile', () => {
    renderWithI18n(<ProductImages images={IMAGES} alt='Paddle surf' />);

    fireEvent.click(phoneTile(2));

    expect(mockPlayFullScreen).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'viewer 1' })).toBeInTheDocument();
  });
});
