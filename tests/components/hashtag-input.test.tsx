/** @jest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HashtagInput from '@/components/marketplace/hashtag-input';
import { adminTexts } from '@/lib/marketplace/admin-texts';

const OPTIONS = [
  { name: 'surf', count: 7 },
  { name: 'música', count: 3 },
  { name: 'playa', count: 1 },
];

function Field({ start = [], max = 5 }: { start?: string[]; max?: number }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <HashtagInput id='tags' value={value} onChange={setValue} options={OPTIONS} max={max} texts={adminTexts('es')} />
      <output>{value.join(',')}</output>
    </>
  );
}

// An open menu hides the rest of the page from roles.
const chosen = () => screen.getByRole('status', { hidden: true }).textContent;
const field = () => screen.getByRole('combobox');
// Typing starts with "+".
const startTyping = () => fireEvent.click(screen.getByRole('button', { name: 'Nuevo hashtag' }));

describe('HashtagInput', () => {
  it('lists every existing one to tick without typing, and unticks it again', async () => {
    const user = userEvent.setup();
    render(<Field />);
    await user.click(screen.getByRole('button', { name: /Hashtags|Elegir/ }));
    expect(screen.getAllByRole('menuitemcheckbox').map((item) => item.textContent)).toEqual(['#surf7', '#música3', '#playa1']);
    await user.click(screen.getByRole('menuitemcheckbox', { name: /#playa/ }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /#surf/ }));
    expect(chosen()).toBe('playa,surf');
    await user.click(screen.getByRole('menuitemcheckbox', { name: /#playa/ }));
    expect(chosen()).toBe('surf');
  });

  it('opens the field for a new one from the list too', async () => {
    const user = userEvent.setup();
    render(<Field />);
    await user.click(screen.getByRole('button', { name: /Elegir/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Nuevo hashtag' }));
    expect(field()).toHaveFocus();
  });

  it('keeps the spelling of one that exists', () => {
    render(<Field />);
    startTyping();
    fireEvent.change(field(), { target: { value: 'MUSICA' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(chosen()).toBe('música');
  });

  it('offers to make a new one, and a space or comma adds it', () => {
    render(<Field />);
    startTyping();
    fireEvent.change(field(), { target: { value: 'tablas' } });
    expect(screen.getByText('Crear')).toBeInTheDocument();
    fireEvent.change(field(), { target: { value: '#tablas ' } });
    expect(chosen()).toBe('tablas');
    expect(field()).toHaveValue('');
  });

  it('adds what was typed when the field is left, so saving does not lose it', () => {
    render(<Field />);
    startTyping();
    fireEvent.change(field(), { target: { value: 'playa' } });
    fireEvent.blur(field());
    expect(chosen()).toBe('playa');
  });

  it('takes the same one only once and removes it again', () => {
    render(<Field start={['surf']} />);
    startTyping();
    fireEvent.change(field(), { target: { value: 'SURF,' } });
    expect(chosen()).toBe('surf');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar #surf' }));
    expect(chosen()).toBe('');
  });

  it('closes the field at the limit, also for a pasted list', () => {
    render(<Field max={2} />);
    startTyping();
    fireEvent.change(field(), { target: { value: '#a #b #c ' } });
    expect(chosen()).toBe('a,b');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
