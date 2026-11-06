import { byTagName, cleanTagName, tagNameIn, tagNameKey, withMissingNames } from '@/lib/tag-names';

describe('etiqueta names', () => {
  it('tidies spaces and keeps capitals and accents', () => {
    expect(cleanTagName('  Segunda   mano ')).toBe('Segunda mano');
    expect(cleanTagName('   ')).toBe('');
  });

  it('treats names that differ only in accents or capitals as the same', () => {
    expect(tagNameKey('Música')).toBe(tagNameKey(' musica '));
  });

  it('shows the name in the language asked, else the one it has', () => {
    expect(tagNameIn({ es: 'Música', en: 'Music' }, 'en')).toBe('Music');
    expect(tagNameIn({ de: 'Looper-Pedal' }, 'es')).toBe('Looper-Pedal');
  });

  it('sorts A to Z in the language asked', () => {
    const tags = [{ names: { es: 'Música', en: 'Music' } }, { names: { es: 'Arte', en: 'Art' } }, { names: { de: 'Bücher' } }];
    expect([...tags].sort(byTagName('es')).map((tag) => tagNameIn(tag.names, 'es'))).toEqual(['Arte', 'Bücher', 'Música']);
  });

  it('only fills languages that have no name yet', () => {
    expect(withMissingNames({ es: 'Música', en: 'Music' }, { en: 'Musics', de: ' Musik ', fr: '' })).toEqual({ es: 'Música', en: 'Music', de: 'Musik' });
  });
});
