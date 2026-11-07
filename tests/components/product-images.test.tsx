/** @jest-environment jsdom */
import { fireEvent, screen } from '@testing-library/react';
import ProductImages from '@/components/shared/product/product-images';
import { playFullScreen } from '@/lib/video-full-screen';
import { renderWithI18n, t } from '../utils/render-with-i18n';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
jest.mock('@/lib/video-full-screen', () => ({ playFullScreen: jest.fn(), playWithSound: jest.fn() }));
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

// The phone's picture comes first in the page, before the desktop one with the same label.
const phonePicture = () => screen.getAllByRole('button', { name: t('IMAGE_FULLSCREEN') })[0];

describe('ProductImages on phones', () => {
  it('loads the videos only once they are on screen, never all at once', () => {
    const { container } = renderWithI18n(<ProductImages images={IMAGES} alt='Paddle surf' />);

    const players = [...container.querySelectorAll('video')].filter((video) => !video.src.includes('#t='));
    expect(players.length).toBeGreaterThan(0);
    players.forEach((video) => {
      expect(video).toHaveAttribute('preload', 'none');
      expect(video).not.toHaveAttribute('autoplay');
    });
  });

  it('puts the tapped video itself in full screen instead of opening the viewer', () => {
    renderWithI18n(<ProductImages images={IMAGES} alt='Paddle surf' />);

    const picture = phonePicture();
    fireEvent.click(picture);

    expect(mockPlayFullScreen).toHaveBeenCalledWith(picture.querySelector('video'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows no sound button for a photo', () => {
    renderWithI18n(<ProductImages images={['/board.jpg']} alt='Paddle surf' />);

    expect(screen.queryByRole('button', { name: t('VIDEO_SOUND_ON') })).not.toBeInTheDocument();
  });

  it('opens the viewer for a photo', () => {
    renderWithI18n(<ProductImages images={['/board.jpg', '/surf.mp4']} alt='Paddle surf' />);

    fireEvent.click(phonePicture());

    expect(mockPlayFullScreen).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'viewer 0' })).toBeInTheDocument();
  });
});

// The dots on the phone's picture; the desktop gallery has none.
const phoneDots = (container: HTMLElement) => container.querySelectorAll('[aria-hidden="true"] > span.rounded-full');

describe('ProductImages dots', () => {
  it('shows one dot per picture and marks the one shown', () => {
    const { container } = renderWithI18n(<ProductImages images={IMAGES} alt='Paddle surf' />);

    expect(phoneDots(container)).toHaveLength(2);
    expect(phoneDots(container)[0]).toHaveClass('bg-foreground');

    fireEvent.click(screen.getByRole('button', { name: t('SHOW_IMAGE', { n: 2 }) }));

    expect(phoneDots(container)[0]).toHaveClass('bg-foreground/35');
    expect(phoneDots(container)[1]).toHaveClass('bg-foreground');
  });

  it('shows no dots for a single picture', () => {
    const { container } = renderWithI18n(<ProductImages images={['/board.jpg']} alt='Paddle surf' />);

    expect(phoneDots(container)).toHaveLength(0);
  });
});
