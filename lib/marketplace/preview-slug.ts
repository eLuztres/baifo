const ADMIN_PREVIEW_PREFIX = 'vista-';
const UUID = /^[0-9a-f-]{36}$/i;

/** Where the admin sees a listing that isn't online (yet) as visitors would: its product page, built from the listing. */
export const adminPreviewSlug = (submissionId: string) => `${ADMIN_PREVIEW_PREFIX}${submissionId}`;

// The listing's whole id, so a product named "Vista al mar" (vista-al-mar-1a2b3c) never counts.
export const isAdminPreviewSlug = (slug: string) => slug.startsWith(ADMIN_PREVIEW_PREFIX) && UUID.test(slug.slice(ADMIN_PREVIEW_PREFIX.length));

/** The listing's id in an admin preview address. */
export const previewSubmissionId = (slug: string) => slug.slice(ADMIN_PREVIEW_PREFIX.length);
