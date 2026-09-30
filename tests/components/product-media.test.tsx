/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import ProductMedia from '@/components/ProductMedia';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string | { src: string }; alt: string }) => (
    <img src={typeof src === 'string' ? src : src.src} alt={alt} />
  ),
}));

function mockFetchContentType(contentType: string) {
  global.fetch = jest.fn().mockResolvedValue({
    headers: new Headers({ 'Content-Type': contentType }),
    blob: async () => new Blob(['video']),
  });
}

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:video');
});

// useMedia caches by src, so every test uses a unique URL
describe('ProductMedia', () => {
  it('shows a loader until the media type is known', () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<ProductMedia src='/pending.jpg' alt='Lamp' />);

    expect(screen.getByRole('img', { name: 'Loading...' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Lamp' })).not.toBeInTheDocument();
  });

  it('renders an image for image content', async () => {
    mockFetchContentType('image/jpeg');
    render(<ProductMedia src='/lamp.jpg' alt='Lamp' />);

    expect(await screen.findByRole('img', { name: 'Lamp' })).toHaveAttribute('src', '/lamp.jpg');
  });

  it('renders a muted looping video from a blob URL for video content', async () => {
    mockFetchContentType('video/mp4');
    const { container } = render(<ProductMedia src='/lamp.mp4' alt='Lamp' />);

    await screen.findByText(/does not support the video tag/);
    const video = container.querySelector('video')!;
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('loop');
    expect(container.querySelector('source')).toHaveAttribute('src', 'blob:video');
  });

  it('keeps the placeholder when the media fails to load', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    render(<ProductMedia src='/broken.jpg' alt='Lamp' fill />);

    await screen.findByText((_, el) => el?.classList.contains('animate-pulse') ?? false);
    expect(screen.queryByRole('img', { name: 'Lamp' })).not.toBeInTheDocument();
  });
});
