/** The ways to reach a listing's person besides their WhatsApp, in the order the editor and the listing show them. */
export const CONTACT_EXTRAS = ['email', 'web', 'instagram'] as const;

export type ContactExtra = (typeof CONTACT_EXTRAS)[number];

export type ListingContacts = Record<ContactExtra, string>;

/** Whether the person can be reached some way besides WhatsApp, which then becomes optional. */
export const hasContactExtra = (contacts?: Partial<Record<ContactExtra, string | null>>) => Boolean(contacts && CONTACT_EXTRAS.some((kind) => contacts[kind]));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INSTAGRAM_USER = /^[a-z0-9._]{1,30}$/i;

/** Each returns the value as it is stored, '' for an empty field, or null when it isn't one. */
export const cleanEmail = (value: string) => {
  const email = value.trim();
  return !email || EMAIL.test(email) ? email : null;
};

export const cleanWeb = (value: string) => {
  const text = value.trim();
  if (!text) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    // Only real web pages: a link like "javascript:" must never reach the listing.
    return /^https?:$/.test(url.protocol) && url.hostname.includes('.') && !/\s/.test(text) ? url.toString() : null;
  } catch {
    return null;
  }
};

// "@user", "user" or a copied profile link all mean the same account.
export const cleanInstagram = (value: string) => {
  const user = value
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');
  return !user || INSTAGRAM_USER.test(user) ? user : null;
};

export const CLEAN_CONTACT: Record<ContactExtra, (value: string) => string | null> = { email: cleanEmail, web: cleanWeb, instagram: cleanInstagram };

export const instagramUrl = (user: string) => `https://www.instagram.com/${user}`;

/** How a web address reads on the listing: without "https://www." and the last slash. */
export const webLabel = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
