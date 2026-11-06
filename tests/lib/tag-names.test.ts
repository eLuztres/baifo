import { byTagName, cleanTagName, findTagByParam, tagHref, tagNameIn, tagNameKey, tagSlug, withMissingNames } from '@/lib/tag-names';

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

describe('etiqueta links', () => {
  const HOME = { id: '11111111-1111-4111-8111-111111111111', names: { es: 'Hogar, objetos y jardín', en: 'Home, things and garden' } };
  const MUSIC = { id: '22222222-2222-4222-8222-222222222222', names: { es: 'Música', en: 'Music' } };
  const TAGS = [HOME, MUSIC];

  it('reads a name in a link: small letters, no accents, words joined by dashes', () => {
    expect(tagSlug('Hogar, objetos y jardín')).toBe('hogar-objetos-y-jardin');
    expect(tagSlug('  Música en vivo! ')).toBe('musica-en-vivo');
    expect(tagSlug('Ñandú')).toBe('nandu');
  });

  it('links to the list with the name in the visitor\'s language', () => {
    expect(tagHref(HOME.names, 'es')).toBe('/explore?etiqueta=hogar-objetos-y-jardin');
    expect(tagHref(MUSIC.names, 'en')).toBe('/explore?etiqueta=music');
  });

  it('falls back to a name it has when the language has none', () => {
    expect(tagHref({ es: 'Saxo' }, 'de')).toBe('/explore?etiqueta=saxo');
  });

  it('finds the etiqueta of a shared link in any of its languages', () => {
    expect(findTagByParam(TAGS, 'musica')).toBe(MUSIC);
    expect(findTagByParam(TAGS, 'music')).toBe(MUSIC);
    expect(findTagByParam(TAGS, 'home-things-and-garden')).toBe(HOME);
  });

  it('finds it however the name was typed into the link', () => {
    expect(findTagByParam(TAGS, 'Música')).toBe(MUSIC);
    expect(findTagByParam(TAGS, 'Hogar, objetos y jardín')).toBe(HOME);
  });

  it('keeps older links by id working', () => {
    expect(findTagByParam(TAGS, HOME.id)).toBe(HOME);
  });

  it('finds nothing for an unknown or missing name', () => {
    expect(findTagByParam(TAGS, 'surf')).toBeUndefined();
    expect(findTagByParam(TAGS, '')).toBeUndefined();
    expect(findTagByParam(TAGS, undefined)).toBeUndefined();
  });

  it('opens the same etiqueta again from the link it makes, in every language', () => {
    for (const locale of ['es', 'en', 'de'] as const) {
      const param = new URL(tagHref(HOME.names, locale), 'http://x').searchParams.get('etiqueta')!;
      expect(findTagByParam(TAGS, param)).toBe(HOME);
    }
  });
});
