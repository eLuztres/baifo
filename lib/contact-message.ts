// Client-safe: the contact pop-up fills in the visitor's nickname in the browser.

/** The WhatsApp message to a seller, in the listing's language: `{nick}` and `{hello}` are filled in the browser. */
export interface ContactMessageTexts {
  hello: string;
  /** The greeting with `{nick}` in it. */
  helloNamed: string;
  /** The whole message with `{hello}` in it, the listing's name and link already in. */
  body: string;
}

export const NICKNAME_MAX_LENGTH = 30;
export const NICKNAME_STORAGE_KEY = 'contact-nickname';

/** A nickname as it may go into the message: no links or odd signs, short, on one line. */
export function cleanNickname(raw: string): string {
  return raw
    .replace(/\S*(?:\/\/|www\.|@|[a-z0-9-]\.[a-z]{2,})\S*/gi, ' ')
    .replace(/[^\p{L}\p{M}\p{N} .'’-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICKNAME_MAX_LENGTH)
    .trim();
}

/** The message with the nickname, or just a hello without one. Replacer functions: a `$` in a name stays as is. */
export function contactMessage(texts: ContactMessageTexts, nickname: string): string {
  const nick = cleanNickname(nickname);
  const hello = nick ? texts.helloNamed.replace('{nick}', () => nick) : texts.hello;
  return texts.body.replace('{hello}', () => hello);
}
