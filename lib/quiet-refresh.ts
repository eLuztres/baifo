// Set by the page right before it fetches what's new in the background, so the server keeps what the person sees
// (e.g. the list's order). Next.js hides its own refresh headers from the middleware, so a cookie carries the signal.
export const QUIET_REFRESH_COOKIE = 'quiet-refresh';
export const QUIET_REFRESH_SECONDS = 60;
