import { hashtagSlug, splitHashtags, toHashtagName, uniqueHashtags, withHashtags } from '@/lib/hashtag-text';

describe('how a hashtag is written', () => {
  it('keeps lowercase letters, digits and "_" only', () => {
    expect(toHashtagName('#Música!')).toBe('música');
    expect(toHashtagName(' clases de surf ')).toBe('clasesdesurf');
    expect(toHashtagName('surf_2026')).toBe('surf_2026');
    expect(toHashtagName('#!?')).toBe('');
  });

  it('stops at 30 characters', () => {
    expect(toHashtagName('a'.repeat(40))).toHaveLength(30);
  });

  it('treats the same word with or without accents as one', () => {
    expect(hashtagSlug('Música')).toBe('musica');
    expect(hashtagSlug('musica')).toBe('musica');
    expect(uniqueHashtags(['música', '#Musica', 'surf', 'surf', '!!'])).toEqual(['música', 'surf']);
  });

  it('finds several in a pasted text', () => {
    expect(splitHashtags('#surf, playa;#Música  ')).toEqual(['surf', 'playa', 'música']);
  });

  it('closes the description with them, and leaves one without alone', () => {
    expect(withHashtags('Tabla usada.', [{ name: 'surf' }, { name: 'playa' }])).toBe('Tabla usada.\n\n#surf #playa');
    expect(withHashtags('Tabla usada.', [])).toBe('Tabla usada.');
    expect(withHashtags('Tabla usada.')).toBe('Tabla usada.');
  });
});
