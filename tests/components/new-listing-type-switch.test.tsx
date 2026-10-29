/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import NewListingForm from '@/components/marketplace/new-listing-form';
import NewListingPage from '@/app/admin/listings/new/page';
import { createAdminListing } from '@/lib/marketplace/admin.actions';
import { adminTexts } from '@/lib/marketplace/admin-texts';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/auth-guard', () => ({ requireAdmin: jest.fn() }));
// The page's other view (a listing already made) reaches the database; not what's tested here.
jest.mock('@/components/marketplace/admin-listing-workspace', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/i18n-server', () => ({ getLocale: jest.fn(async () => 'es') }));
jest.mock('@/lib/marketplace/admin.actions', () => ({ createAdminListing: jest.fn(async () => ({ success: true, message: '', id: 'sub-1' })) }));
jest.mock('@/lib/prepare-photos', () => ({ preparePhotos: jest.fn(async (files: File[]) => files) }));
jest.mock('@/lib/video-upload', () => ({ uploadVideos: jest.fn(async () => []) }));
// An upload the test can hold open, to choose a step while it is still on its way.
let uploadGate: Promise<void> = Promise.resolve();
jest.mock('@/lib/uploadthing', () => ({
  useUploadThing: () => ({
    startUpload: jest.fn(async () => {
      await uploadGate;
      return [{ ufsUrl: 'https://x.ufs.sh/f/bike.jpg' }];
    }),
  }),
}));
// The stage and thumbnails' images aren't what's tested here.
jest.mock('@/components/ProductMedia', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/marketplace/listing-stage', () => ({ __esModule: true, default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const texts = adminTexts('es');

const findForm = (node: ReactNode): ReactElement | undefined => {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(findForm).find(Boolean);
  const element = node as ReactElement<{ children?: ReactNode }>;
  return element.type === NewListingForm ? element : findForm(element.props.children);
};

describe('switching the type on /admin/listings/new (card 293)', () => {
  it('keeps the same form, so it is not mounted again and its photos stay', async () => {
    const form = findForm(await NewListingPage({ searchParams: Promise.resolve({ tipo: 'servicios' }) }));

    expect(form).toBeDefined();
    expect(form!.key).toBeNull();
  });

  it('keeps an uploaded photo when the type changes and creates the listing with it', async () => {
    const { container, rerender } = render(<NewListingForm texts={texts} type='PRODUCT' />);
    const input = container.querySelector('input[type=file]')!;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['photo'], 'bike.jpg', { type: 'image/jpeg' })] } });
    });
    expect(screen.getAllByLabelText(`${texts.photosLabel} 1`)).not.toHaveLength(0);

    rerender(<NewListingForm texts={texts} type='WANTED' />);
    rerender(<NewListingForm texts={texts} type='PRODUCT' />);

    expect(screen.getAllByLabelText(`${texts.photosLabel} 1`)).not.toHaveLength(0);
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: texts.makePictures, hidden: true })[0]);
    });
    expect(createAdminListing).toHaveBeenCalledWith({ photos: ['https://x.ufs.sh/f/bike.jpg'], type: 'PRODUCT', useAi: true });
  });

  it('drops a step chosen during the upload when the type changes, so an event gets no AI pictures', async () => {
    let finishUpload = () => {};
    uploadGate = new Promise((resolve) => (finishUpload = resolve));
    (createAdminListing as jest.Mock).mockClear();
    const { container, rerender } = render(<NewListingForm texts={texts} type='PRODUCT' />);
    await act(async () => {
      fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['photo'], 'bike.jpg', { type: 'image/jpeg' })] } });
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: texts.makePictures, hidden: true })[0]);
    });

    rerender(<NewListingForm texts={texts} type='EVENT' />);
    await act(async () => finishUpload());

    expect(createAdminListing).not.toHaveBeenCalled();
    expect(screen.getAllByLabelText(`${texts.photosLabel} 1`)).not.toHaveLength(0);
  });
});
