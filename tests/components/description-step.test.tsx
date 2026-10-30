/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DescriptionStep from '@/components/marketplace/description-step';
import { describeAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

jest.mock('@/lib/marketplace/admin.actions', () => ({ describeAdminListing: jest.fn(), retryAdminListing: jest.fn() }));
jest.mock('@/components/i18n-provider', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('@/components/shared/voice-input-button', () => () => null);
jest.mock('@/components/ProductMedia', () => () => null);

// Any text the step shows is just its key, so the buttons can be found by it.
const texts = new Proxy({}, { get: (_, key) => String(key) }) as AdminTexts;
const mockDescribe = describeAdminListing as jest.Mock;

const listing = {
  id: 'abc',
  type: 'PRODUCT',
  status: 'COLLECTING',
  rawText: '',
  textMode: 'ai',
  originalTitle: null,
  rawImages: [],
  images: [],
  usesAi: true,
  lastError: null,
  title: null,
  createdByAdmin: true,
} as unknown as AdminListing;

const renderStep = (onPhotos = jest.fn()) =>
  render(<DescriptionStep listing={listing} languages={[]} texts={texts} onSent={jest.fn()} showsSteps onPhotos={onPhotos} />);

beforeEach(() => mockDescribe.mockReset());

describe('DescriptionStep', () => {
  it('without a photo, only goes on to the contact once there is a description', () => {
    renderStep();

    expect(screen.getByRole('button', { name: /nextStep/ })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bici, 80€' } });
    fireEvent.click(screen.getByRole('button', { name: /nextStep/ }));

    expect(screen.getByLabelText('servicePhoneLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /writeListing/ })).toBeInTheDocument();
  });

  it('sends the description with the number and the name from the contact step', async () => {
    mockDescribe.mockResolvedValue({ success: true });
    renderStep();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bici, 80€' } });
    fireEvent.click(screen.getByRole('button', { name: /nextStep/ }));
    fireEvent.change(screen.getByLabelText('servicePhoneLabel'), { target: { value: ' 612345678 ' } });
    fireEvent.change(screen.getByLabelText('sellerNameLabel'), { target: { value: 'Lula' } });
    fireEvent.click(screen.getByRole('button', { name: /writeListing/ }));

    await waitFor(() => expect(mockDescribe).toHaveBeenCalled());
    expect(mockDescribe).toHaveBeenCalledWith('abc', expect.objectContaining({ notes: 'Bici, 80€', sellerPhone: '612345678', sellerName: 'Lula' }));
  });

  it('asks for the number before sending', async () => {
    renderStep();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bici, 80€' } });
    fireEvent.click(screen.getByRole('button', { name: /nextStep/ }));
    fireEvent.click(screen.getByRole('button', { name: /writeListing/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('contactNeedsNumber');
    expect(mockDescribe).not.toHaveBeenCalled();
  });

  it('goes back to the description with everything written kept', () => {
    renderStep();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bici, 80€' } });
    fireEvent.click(screen.getByRole('button', { name: /nextStep/ }));
    fireEvent.change(screen.getByLabelText('sellerNameLabel'), { target: { value: 'Lula' } });
    fireEvent.click(screen.getByRole('button', { name: /stepDetails/ }));

    expect(screen.getByLabelText('tellLabel')).toHaveValue('Bici, 80€');
    fireEvent.click(screen.getByRole('button', { name: /nextStep/ }));
    expect(screen.getByLabelText('sellerNameLabel')).toHaveValue('Lula');
  });

  it('from the contact, the photos step comes back to the description', () => {
    const onPhotos = jest.fn();
    renderStep(onPhotos);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bici, 80€' } });
    fireEvent.click(screen.getByRole('button', { name: /nextStep/ }));
    fireEvent.click(screen.getByRole('button', { name: /stepPhotos/ }));

    expect(onPhotos).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /nextStep/ })).toBeInTheDocument();
  });

  it('fills the WhatsApp with the number written in the description, unless one is already there', () => {
    renderStep();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Concierto a las 20:00. Info: 628 111 222' } });
    fireEvent.click(screen.getByRole('button', { name: /nextStep/ }));
    expect(screen.getByLabelText('servicePhoneLabel')).toHaveValue('628 111 222');

    fireEvent.change(screen.getByLabelText('servicePhoneLabel'), { target: { value: '699 000 000' } });
    fireEvent.click(screen.getByRole('button', { name: /stepDetails/ }));
    fireEvent.click(screen.getByRole('button', { name: /nextStep/ }));
    expect(screen.getByLabelText('servicePhoneLabel')).toHaveValue('699 000 000');
  });

  it('leaves the WhatsApp empty when the description has no number', () => {
    renderStep();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bici, 180 euros' } });
    fireEvent.click(screen.getByRole('button', { name: /nextStep/ }));

    expect(screen.getByLabelText('servicePhoneLabel')).toHaveValue('');
  });
});
