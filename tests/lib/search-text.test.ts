import { foldText, mainMatches, matchRange, matchesWords, queryWords, searchScore } from '@/lib/search-text';

describe('search text', () => {
  it('folds case and accents without moving any letter', () => {
    expect(foldText('Cerámica ÑANDÚ')).toBe('ceramica nandu');
    expect(foldText('Cerámica').length).toBe('Cerámica'.length);
  });

  it('splits a query into folded words', () => {
    expect(queryWords('  Bici, de MONTAÑA ')).toEqual(['bici', 'de', 'montana']);
    expect(queryWords('   ')).toEqual([]);
  });

  it('needs every word, and takes plurals', () => {
    expect(matchesWords('bicicleta de montana orbea', ['bici', 'orbea'])).toBe(true);
    expect(matchesWords('bicicleta de montana', ['bici', 'surf'])).toBe(false);
    expect(matchesWords('tabla de surf', ['tablas'])).toBe(true);
    expect(matchesWords('motor', ['motores'])).toBe(true);
    expect(matchesWords('anything', [])).toBe(false);
  });

  it('puts a name that starts with the query before one found only in the description', () => {
    const inName = searchScore({ names: 'surf board', rest: '' }, ['surf']);
    const inMiddle = searchScore({ names: 'tabla de surf', rest: '' }, ['surf']);
    const inText = searchScore({ names: 'neopreno', rest: 'para hacer surf' }, ['surf']);
    expect(inName).toBeGreaterThan(inMiddle);
    expect(inMiddle).toBeGreaterThan(inText);
    expect(inText).toBeGreaterThan(0);
    expect(searchScore({ names: 'neopreno', rest: '' }, ['surf'])).toBe(0);
  });

  it('matches at the start of a word only, also in other languages', () => {
    expect(matchesWords('imanes para la nevera', ['iman'])).toBe(true);
    expect(matchesWords('🧲 imanes', ['iman'])).toBe(true);
    expect(matchesWords('dimanche 8 novembre', ['iman'])).toBe(false);
    expect(matchesWords('da una settimana a 3 mesi', ['iman'])).toBe(false);
    expect(matchRange('Dimanche, imanes', ['iman'])).toEqual({ start: 10, end: 14 });
  });

  it('shows only listings named so when there are any, else the ones that mention it', () => {
    const textOf = (text: { names: string; rest: string }) => text;
    const named = { names: 'imanes de nevera', rest: '' };
    const mentioned = { names: 'taller de manualidades', rest: 'hacemos imanes' };
    const other = { names: 'neopreno', rest: 'talla m' };
    expect(mainMatches([mentioned, other, named], textOf, ['iman'])).toEqual([named]);
    expect(mainMatches([mentioned, other], textOf, ['iman'])).toEqual([mentioned]);
    expect(mainMatches([other], textOf, ['iman'])).toEqual([]);
  });

  it('finds where the first word sits in a name with accents', () => {
    expect(matchRange('Cerámica artesanal', ['ceram'])).toEqual({ start: 0, end: 5 });
    expect(matchRange('Busco tablas', ['tablas'])).toEqual({ start: 6, end: 12 });
    expect(matchRange('Bici', ['surf'])).toBeNull();
  });
});
