/** @jest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagInput from '@/components/marketplace/tag-input';
import type { EditorTag } from '@/components/marketplace/editor-types';
import { translateTags } from '@/lib/actions/tag.actions';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import type { Locale } from '@/lib/i18n-core';

jest.mock('@/lib/actions/tag.actions', () => ({ translateTags: jest.fn() }));

const OPTIONS = [
  { id: 'surf', names: { es: 'Surf', en: 'Surfing' }, count: 7 },
  { id: 'musica', names: { es: 'Música', en: 'Music' }, count: 3 },
  { id: 'arte', names: { es: 'Arte' }, count: 1 },
];

function Field({ start = [], language = 'es' }: { start?: EditorTag[]; language?: Locale }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <TagInput id='tags' value={value} onChange={setValue} options={OPTIONS} language={language} languages={['es', 'en']} max={5} texts={adminTexts('es')} onError={jest.fn()} />
      <output>{value.map((tag) => `${tag.id ?? 'new'}:${Object.entries(tag.names).map(([locale, name]) => `${locale}=${name}`).join('/')}`).join(',')}</output>
    </>
  );
}

// An open menu hides the rest of the page from roles.
const chosen = () => screen.getByRole('status', { hidden: true }).textContent;

describe('TagInput', () => {
  it('lists every etiqueta A to Z in the tab\'s language, to tick without typing', async () => {
    const user = userEvent.setup();
    render(<Field language='en' />);
    await user.click(screen.getByRole('button', { name: /Elegir/ }));
    expect(screen.getAllByRole('menuitemcheckbox').map((item) => item.textContent)).toEqual(['Arte1', 'Music3', 'Surfing7']);
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Music/ }));
    expect(chosen()).toBe('musica:es=Música/en=Music');
  });

  it('makes a new one in the tab\'s language, or takes the one that already has the typed name', async () => {
    render(<Field language='en' />);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva etiqueta' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Looper pedal' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva etiqueta' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'music' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(chosen()).toBe('new:en=Looper pedal,musica:es=Música/en=Music');
  });

  it('shows a name missing in this tab as not translated, and fills it with Traducir from the tab', async () => {
    (translateTags as jest.Mock).mockResolvedValue({ success: true, message: '', translations: [{ en: 'Art' }] });
    render(<Field start={[OPTIONS[2]]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Traducir' }));
    await waitFor(() => expect(chosen()).toBe('arte:es=Arte/en=Art'));
    expect(translateTags).toHaveBeenCalledWith('es', ['Arte']);
    expect(screen.queryByRole('button', { name: 'Traducir' })).not.toBeInTheDocument();
  });

  it('has nothing to translate from a tab the etiqueta has no name in', () => {
    render(<Field start={[OPTIONS[2]]} language='en' />);
    expect(screen.getByTitle('Sin traducir a este idioma')).toHaveTextContent('Arte?');
    expect(screen.queryByRole('button', { name: 'Traducir' })).not.toBeInTheDocument();
  });
});
