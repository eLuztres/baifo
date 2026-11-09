// The search's links in the Mercadillo editor, read there instead of opened: a kind, an etiqueta, a listing or every match.
// Not in the client component: the server page builds them too.
export const SEARCH_PATH = 'todo';
export const LISTING_LINK = 'anuncio:';
export const KIND_LINK = 'tipo:';
export const TAG_LINK = 'tag:';
export const kindLink = (param: string) => `${KIND_LINK}${param}`;
export const tagLink = (id: string) => `${TAG_LINK}${id}`;
