/** @jest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DescriptionStep from '@/components/marketplace/description-step';
import { describeAdminListing, type AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

jest.mock('@/lib/marketplace/admin.actions', () => ({ describeAdminListing: jest.fn(), retryAdminListing: jest.fn() }));
jest.mock('@/components/i18n-provider', () => ({ useI18n: () => ({ t: (key: string) => key, locale: 'en' }) }));
jest.mock('@/components/shared/voice-input-button', () => () => null);
jest.mock('@/components/ProductMedia', () => () => null);

// Any text the step shows is just its key, so the buttons can be found by it.
const texts = new Proxy({}, { get: (_, key) => (key === 'missingToPublish' ? 'missing: {items}' : String(key)) }) as AdminTexts;
const mockDescribe = describeAdminListing as jest.Mock;

const listing = {
  id: 'abc',
  type: 'PRODUCT',
  status: 'COLLECTING',
  rawText: '',
  textMode: 'ai',
  originalTitle: null,
  rawImages: [],
  images: ['https://x.ufs.sh/f/bike.jpg'],
  usesAi: true,
  lastError: null,
  title: null,
  createdByAdmin: true,
} as unknown as AdminListing;

// The workspace's step bar, as two plain buttons.
function Steps({ shown = listing }: { shown?: AdminListing }) {
  const [step, setStep] = useState(1);
  return (
    <>
      <button onClick={() => setStep(0)}>stepPhotos</button>
      <button onClick={() => setStep(1)}>stepDetails</button>
      <button onClick={() => setStep(2)}>stepContact</button>
      <DescriptionStep listing={shown} languages={[]} texts={texts} onSent={jest.fn()} step={step} onStep={setStep} />
    </>
  );
}

const renderStep = (shown?: AdminListing) => render(<Steps shown={shown} />);

beforeEach(() => mockDescribe.mockReset());

describe('DescriptionStep', () => {
  it('finishes from any step, naming everything missing and opening the first step it is on', async () => {
    renderStep({ ...listing, images: [] });
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));

    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('missing: missingPicture, missingText, missingPhone, and missingConsent');
    expect(screen.queryByLabelText('servicePhoneLabel')).not.toBeInTheDocument();
    expect(mockDescribe).not.toHaveBeenCalled();
  });

  it('sends the description with the number and the name from the contact step', async () => {
    mockDescribe.mockResolvedValue({ success: true });
    renderStep();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bici, 80€' } });
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    fireEvent.change(screen.getByLabelText('servicePhoneLabel'), { target: { value: ' 612345678 ' } });
    fireEvent.change(screen.getByLabelText('sellerNameLabel'), { target: { value: 'Lula' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    await waitFor(() => expect(mockDescribe).toHaveBeenCalled());
    expect(mockDescribe).toHaveBeenCalledWith('abc', expect.objectContaining({ notes: 'Bici, 80€', sellerPhone: '612345678', sellerName: 'Lula', hasConsent: true }));
  });

  it('asks for the number and the person\'s OK before publishing', async () => {
    renderStep();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bici, 80€' } });
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    fireEvent.click(screen.getByRole('button', { name: /publishButton/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('missing: missingPhone and missingConsent');
    expect(mockDescribe).not.toHaveBeenCalled();
  });

  it('goes back to the description with everything written kept', () => {
    renderStep();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bici, 80€' } });
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    fireEvent.change(screen.getByLabelText('sellerNameLabel'), { target: { value: 'Lula' } });
    fireEvent.click(screen.getByRole('button', { name: /stepDetails/ }));

    expect(screen.getByLabelText('tellLabel')).toHaveValue('Bici, 80€');
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    expect(screen.getByLabelText('sellerNameLabel')).toHaveValue('Lula');
  });

  it('fills the WhatsApp with the number written in the description, unless one is already there', () => {
    renderStep();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Concierto a las 20:00. Info: 628 111 222' } });
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    expect(screen.getByLabelText('servicePhoneLabel')).toHaveValue('628 111 222');

    fireEvent.change(screen.getByLabelText('servicePhoneLabel'), { target: { value: '699 000 000' } });
    fireEvent.click(screen.getByRole('button', { name: /stepDetails/ }));
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));
    expect(screen.getByLabelText('servicePhoneLabel')).toHaveValue('699 000 000');
  });

  it('leaves the WhatsApp empty when the description has no number', () => {
    renderStep();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bici, 180 euros' } });
    fireEvent.click(screen.getByRole('button', { name: /stepContact/ }));

    expect(screen.getByLabelText('servicePhoneLabel')).toHaveValue('');
  });
});
