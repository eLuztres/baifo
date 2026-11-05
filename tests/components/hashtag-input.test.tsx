/** @jest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

const chosen = () => screen.getByRole('status').textContent;
const field = () => screen.getByRole('combobox');

describe('HashtagInput', () => {
  it('suggests the most used on focus and adds a picked one', () => {
    render(<Field />);
    fireEvent.focus(field());
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['#surf7', '#música3', '#playa1']);
    fireEvent.mouseDown(screen.getByText('#playa'));
    expect(chosen()).toBe('playa');
  });

  it('keeps the spelling of one that exists', () => {
    render(<Field />);
    fireEvent.change(field(), { target: { value: 'MUSICA' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(chosen()).toBe('música');
  });

  it('offers to make a new one, and a space or comma adds it', () => {
    render(<Field />);
    fireEvent.change(field(), { target: { value: 'tablas' } });
    expect(screen.getByText('Crear')).toBeInTheDocument();
    fireEvent.change(field(), { target: { value: '#tablas ' } });
    expect(chosen()).toBe('tablas');
    expect(field()).toHaveValue('');
  });

  it('adds what was typed when the field is left, so saving does not lose it', () => {
    render(<Field />);
    fireEvent.change(field(), { target: { value: 'playa' } });
    fireEvent.blur(field());
    expect(chosen()).toBe('playa');
  });

  it('takes the same one only once and removes it again', () => {
    render(<Field start={['surf']} />);
    fireEvent.change(field(), { target: { value: 'SURF,' } });
    expect(chosen()).toBe('surf');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar #surf' }));
    expect(chosen()).toBe('');
  });

  it('closes the field at the limit, also for a pasted list', () => {
    render(<Field max={2} />);
    fireEvent.change(field(), { target: { value: '#a #b #c ' } });
    expect(chosen()).toBe('a,b');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
