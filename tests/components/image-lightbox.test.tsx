/** @jest-environment jsdom */
import { screen } from '@testing-library/react';
import ImageLightbox from '@/components/shared/image-lightbox';
import { renderWithI18n } from '../utils/render-with-i18n';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const IMAGES = ['/a.jpg', '/b.jpg'];

describe('ImageLightbox action', () => {
  it('shows the extra button for the open photo', () => {
    renderWithI18n(<ImageLightbox images={IMAGES} alt='Board' index={1} onIndexChange={jest.fn()} action={<button>Make main</button>} />);

    expect(screen.getByRole('button', { name: 'Make main' })).toBeInTheDocument();
  });

  it('shows nothing while the viewer is closed', () => {
    renderWithI18n(<ImageLightbox images={IMAGES} alt='Board' index={null} onIndexChange={jest.fn()} action={<button>Make main</button>} />);

    expect(screen.queryByRole('button', { name: 'Make main' })).not.toBeInTheDocument();
  });
});
