// Prompts of the AI product studio, shared by scripts/product-studio.mjs and the admin studio page.
// Prompt order follows what image models read best: subject, scene, light, camera, then exclusions.
// The product's identity comes from the reference photos, not from words. A shop replaces any prompt in brand/studio.mjs.
import shop from '../../brand/studio.mjs';

const LANGUAGES = { en: 'English', es: 'Spanish', de: 'German', fr: 'French', it: 'Italian' };

export const STUDIO_LOOK =
  shop.STUDIO_LOOK ??
  'Scene: a calm, light studio set with a softly textured surface and a plain wall behind it, softly out of focus. ' +
    'Light: soft daylight from a window on the left, a gentle highlight on the product and a soft contact shadow. ' +
    'Camera: full-frame camera, 100mm lens at f/4, shallow depth of field, the product tack sharp. ' +
    'Photorealistic editorial product photography, natural colors, calm and elegant. ' +
    'No hands, no people, no text, no logos, no watermark.';

export const KEEP_IDENTICAL =
  shop.KEEP_IDENTICAL ??
  'The product must stay IDENTICAL to the reference: same shape, proportions, materials, colors, patterns and ' +
    'finish. Do not add details, parts or decorations that are not visible in the reference.';

export const SHOTS = shop.SHOTS ?? {
  hero:
    'The product from the reference photo(s) stands on the surface of the scene, turned diagonally at about 45 ' +
    'degrees to the camera. Vertical composition: the product in the lower middle third, the background of the ' +
    'scene rising above it. Remove the original background, hands, clutter and any text. ',
  side: 'The same product on the surface of the scene, seen exactly from the side at product height. ',
  top: 'The same product on the surface of the scene, seen from straight above. ',
};

/** A stable number from a text (e.g. the photo URL), so all views of one product share their scene. */
export function seedOf(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return hash;
}

/** The cover of a Mercadillo: its own world and mood from the words, never a product. */
export const coverPrompt =
  shop.coverPrompt ??
  ((scene) =>
    `${scene}. Vertical composition with the most striking detail sharp in the lower middle third. Editorial ` +
    'photography with the light, colors and mood the scene describes. Only the world of the scene: no products, ' +
    'no hands, no people, no text, no logos, no watermark.');

// With the other Mercadillos' covers as references, a new cover joins them as one series.
export const coverLikeOthersPrompt =
  shop.coverLikeOthersPrompt ??
  ((name, description) =>
    `A new cover photograph for the market "${name}". Match the reference photos exactly in style: the same ` +
    'light, setting, colours, colour grading, photographic realism and depth of field, so it sits in the same series. ' +
    'Do not copy their objects. ' +
    (description ? `What it shows: ${description}. ` : '') +
    'A calm, tidy still life that says what it is about. Vertical composition. ' +
    'No people, no hands, no text, no logos, no watermark.');

// A flat backdrop without shadow is what lets the background removal cut the product out cleanly.
export const CUTOUT_SHOT =
  shop.CUTOUT_SHOT ??
  'Recreate the product from the reference photo as a single isolated product shot: the product floats in the air, ' +
    'turned about 35 degrees to the camera. ' + KEEP_IDENTICAL + ' ' +
    'Background: fully transparent, nothing but the product: no backdrop, no surface, no shadow and no reflection. ' +
    'Soft studio light from the upper left with a crisp highlight on the edges. ' +
    'Photorealistic product photography, the whole product tack sharp, centered, filling about 70% of the frame. ' +
    'No hands, no props, no text, no watermark.';

export const STYLE_REFERENCE_NOTE =
  shop.STYLE_REFERENCE_NOTE ??
  'The last image is a STYLE reference only: match its setting, light, colors and mood. ' +
    'Never copy its product; the product must come from the earlier reference photo(s).';

// Env is read on each call: the studio script loads .env only after its imports have run.
const textLanguage = () =>
  LANGUAGES[process.env.STUDIO_TEXT_LOCALE || process.env.DEFAULT_LOCALE || 'en'] ?? LANGUAGES.en;

export const TEXT_PROMPT =
  shop.TEXT_PROMPT ??
  ((notes, hasInfoImage = false) =>
    `You write product copy for ${process.env.APP_NAME || 'an online shop'}` +
    (process.env.APP_DESCRIPTION ? ` (${process.env.APP_DESCRIPTION})` : '') +
    `. Look at the product and return JSON in ${textLanguage()}:\n` +
    '- name: 2–7 words, elegant, naming only what you can actually see.\n' +
    '- description: 1–3 short sentences about the visible materials, colors and style. Do not invent sizes, ' +
    'origins, brands or material claims unless the maker notes state them.\n' +
    (notes ? `Maker notes (trust these): ${notes}\n` : '') +
    (hasInfoImage
      ? "The second image is the maker's info sheet (a handwritten note or label). Read every detail on it, such as " +
        'size, materials, origin or signs, and trust it like maker notes. Name the size and materials from it in ' +
        'the description.\n'
      : ''));

export const TEXT_SCHEMA = {
  type: 'object',
  properties: { name: { type: 'string' }, description: { type: 'string' } },
  required: ['name', 'description'],
};
