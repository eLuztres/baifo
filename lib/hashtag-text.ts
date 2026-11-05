// How a hashtag is written, the same in the editor, the actions and the admin page.
import { foldText } from '@/lib/search-text';

export const MAX_HASHTAG_LENGTH = 30;

/** "#Música!" becomes "música": lowercase, only letters, digits and "_". Empty when nothing is left. */
export const toHashtagName = (text: string) =>
  text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]/gu, '')
    .slice(0, MAX_HASHTAG_LENGTH);

/** What makes two hashtags the same one: "música" and "musica" share it. Also how they are found. */
export const hashtagSlug = (name: string) => foldText(toHashtagName(name));

/** The hashtags in a typed or pasted text: "#surf, playa" gives ["surf", "playa"]. */
export const splitHashtags = (text: string) => text.split(/[\s,;#]+/).map(toHashtagName).filter(Boolean);

/** The written hashtags, each once, in the order they came. */
export const uniqueHashtags = (names: string[]) => {
  const bySlug = new Map<string, string>();
  for (const name of names.map(toHashtagName).filter(Boolean)) if (!bySlug.has(hashtagSlug(name))) bySlug.set(hashtagSlug(name), name);
  return [...bySlug.values()];
};

/** A listing's description as visitors read it: its hashtags close the text. */
export const withHashtags = (description: string, hashtags: { name: string }[] = []) =>
  hashtags.length > 0 ? `${description}\n\n${hashtags.map(({ name }) => `#${name}`).join(' ')}` : description;
