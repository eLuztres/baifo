/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import ProductMedia from '@/components/ProductMedia';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    onError,
  }: {
    src: string | { src: string };
    alt: string;
    onError?: () => void;
  }) => <img src={typeof src === 'string' ? src : src.src} alt={alt} onError={onError} />,
}));

beforeEach(() => {
  global.fetch = jest.fn();
});

// useMedia remembers videos by src, so every test uses a unique URL
describe('ProductMedia', () => {
  it('renders the image right away, without downloading it first', () => {
    render(<ProductMedia src='/pending.jpg' alt='Lamp' />);

    expect(screen.getByRole('img', { name: 'Lamp' })).toHaveAttribute('src', '/pending.jpg');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders an image for an image URL', () => {
    render(<ProductMedia src='/lamp.jpg' alt='Lamp' fill />);

    expect(screen.getByRole('img', { name: 'Lamp' })).toHaveAttribute('src', '/lamp.jpg');
  });

  it('renders a muted looping video straight from the URL for a video file', () => {
    const { container } = render(<ProductMedia src='/lamp.mp4' alt='Lamp' />);

    const video = container.querySelector('video')!;
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('src', '/lamp.mp4');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('retries a failing image as a video, then shows a quiet placeholder', () => {
    const { container } = render(<ProductMedia src='/broken' alt='Lamp' fill />);

    fireEvent.error(screen.getByRole('img', { name: 'Lamp' }));
    const video = container.querySelector('video')!;
    expect(video).toHaveAttribute('src', '/broken');

    fireEvent.error(video);
    expect(container.querySelector('video')).not.toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Lamp' })).toHaveClass('bg-muted');
  });
});
