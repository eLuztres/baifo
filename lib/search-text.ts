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

// Only at the start of a word: "iman" finds "imanes", never "dimanche"; "bici" still finds "bicicleta" while typing.
function wordStartIndex(folded: string, form: string) {
  for (let index = folded.indexOf(form); index >= 0; index = folded.indexOf(form, index + 1)) {
    if (index === 0 || !/[\p{L}\p{N}]/u.test(folded[index - 1])) return index;
  }
  return -1;
}

const hasWord = (folded: string, word: string) => wordForms(word).some((form) => wordStartIndex(folded, form) >= 0);

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

/** The best matches, best first. When some hold every word in their names only those count: a mention in a description is not what was looked for.
    With none, the descriptions, categories and kinds are searched. */
export function mainMatches<T>(items: T[], textOf: (item: T) => SearchableText, words: string[]) {
  const found = items
    .map((item) => ({ item, text: textOf(item), score: searchScore(textOf(item), words) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  const named = found.filter(({ text }) => matchesWords(text.names, words));
  return (named.length > 0 ? named : found).map(({ item }) => item);
}

/** Where the first typed word sits in a name, for showing it in bold; null when the name doesn't hold it. */
export function matchRange(name: string, words: string[]) {
  const folded = foldText(name);
  for (const form of words.length > 0 ? wordForms(words[0]) : []) {
    const start = wordStartIndex(folded, form);
    if (start >= 0) return { start, end: start + form.length };
  }
  return null;
}
