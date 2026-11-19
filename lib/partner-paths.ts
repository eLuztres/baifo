// Client-safe: the editor and the panel's pages link with these.

/** A partner's own mercadillo page. */
export const partnerPath = (slug: string) => `/mercadillo/${slug}`;

/** The partner's panel, once its private link was opened. */
export const PARTNER_PANEL_PATH = '/gestionar';

/** One of its listings in the editor. */
export const partnerListingPath = (id: string) => `${PARTNER_PANEL_PATH}/anuncio/${id}`;
