// The feed's search: one way to match a typed query against a listing or category, on the server and in the field.

/** Lowercase and without accents, character by character, so positions in the folded text match the original's. */
export const foldText = (text: string) =>
  Array.from(text.toLowerCase(), (char) => char.normalize('NFD').replace(/\p{Diacritic}/gu, '').charAt(0) || char).join('');

/** The typed words, folded; a few letters are already enough. */
export const queryWords = (query: string) => foldText(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// "bicis" finds "bici", "motores" finds "motor": a plural ending counts as optional.
const wordForms = (word: string) => {
  if (word.length <= 3) return [word];
  if (word.endsWith('es') && word.length > 4) return [word, word.slice(0, -2), word.slice(0, -1)];
  return word.endsWith('s') ? [word, word.slice(0, -1)] : [word];
};

const hasWord = (folded: string, word: string) => wordForms(word).some((form) => folded.includes(form));

/** Whether every typed word shows up somewhere in the (folded) text. */
export const matchesWords = (folded: string, words: string[]) => words.length > 0 && words.every((word) => hasWord(folded, word));

export interface SearchableText {
  /** Its names, folded: what it is called in every language. */
  names: string;
  /** Everything else, folded: descriptions, categories, its kind. */
  rest: string;
}

/** How well a match fits: a name that starts with the query first, then names that hold it, then the rest. 0: no match. */
export function searchScore({ names, rest }: SearchableText, words: string[]) {
  if (!matchesWords(`${names} ${rest}`, words)) return 0;
  const inNames = words.filter((word) => hasWord(names, word)).length;
  const startsName = names.split(' | ').some((name) => wordForms(words[0]).some((form) => name.startsWith(form)));
  return 1 + inNames * 2 + (startsName ? 3 : 0);
}

/** Where the first typed word sits in a name, for showing it in bold; null when the name doesn't hold it. */
export function matchRange(name: string, words: string[]) {
  const folded = foldText(name);
  for (const form of words.length > 0 ? wordForms(words[0]) : []) {
    const start = folded.indexOf(form);
    if (start >= 0) return { start, end: start + form.length };
  }
  return null;
}
