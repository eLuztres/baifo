// Prompts of the AI ring studio, shared by scripts/product-studio.mjs and the admin studio page.
// Prompt order follows what image models read best: subject, scene, light, camera, then exclusions.
// The ring's identity comes from the reference photos, not from words. Rings without a store category get
// this quiet old-world salon; the others get their category's scene (categoryLook).
export const STUDIO_LOOK =
  'Scene: a polished dark mahogany table with a plump black velvet jewelry cushion. Behind it, softly out of focus, ' +
  'a wall with cream and pale-gold damask wallpaper and the lower corner of a gilded picture frame. A few small rough ' +
  'raw stones and polished beads in the same colors as the ring itself lie scattered on the table, out of focus ' +
  '(if the ring has no stones, use small pieces of its own materials instead). ' +
  'Light: warm late-afternoon sunlight from a window on the left, casting soft diagonal window-frame shadows across ' +
  'the wall, a gentle specular highlight on the metal and a soft contact shadow on the velvet. ' +
  'Camera: full-frame camera, 100mm macro lens at f/2.8, shallow depth of field, the ring tack sharp. ' +
  'Photorealistic editorial jewelry photography, rich but natural colors, quiet luxury, calm and elegant. ' +
  'No hands, no people, no text, no logos, no watermark.';

export const KEEP_IDENTICAL =
  'The ring must stay IDENTICAL to the reference: same shape, width, profile, materials, colors, inlay pattern, ' +
  'wood grain, stone fragments and metal finish, with the same proportions. Do not add stones, engravings or ' +
  'details that are not visible in the reference.';

export const SHOTS = {
  hero:
    'The ring from the reference photo(s) stands upright on the surface of the scene, turned diagonally at about 45 ' +
    'degrees to the camera, so both the outer surface with its inlay and part of the inside of the band are visible. ' +
    'Vertical composition: the ring in the lower middle third, the background of the scene ' +
    'rising above it. Remove the original background, hands, clutter and any text. ',
  side:
    'The same ring standing upright on the surface of the scene, seen exactly from the side at ring height: the camera ' +
    'looks straight at the outer surface, so the band appears as a flat vertical strip with its full width and inlay ' +
    'facing the camera, and the opening of the ring is not visible at all. ',
  // "top" keeps its file name; it is the view through the ring.
  top:
    'The same ring standing upright on the surface of the scene, seen exactly from the front along its axis: the ring ' +
    'appears as a perfect circle and the camera looks straight through the opening to the softly blurred scene ' +
    'behind it; only the thin edge of the band and its inside are visible. ',
};

// Small camera changes, so the rings of one category don't all look shot in the same second.
const CAMERAS = [
  'Camera: full-frame camera, 100mm macro lens at f/2.8, at ring height, shallow depth of field.',
  'Camera: full-frame camera, 85mm lens at f/2.2, slightly above the ring looking a little down, shallow depth of field.',
  'Camera: full-frame camera, 100mm macro lens at f/4, a little lower than the ring, turned about 10 degrees further to the left.',
  'Camera: full-frame camera, 90mm lens at f/2.8, turned about 15 degrees further to the right, shallow depth of field.',
];

/** A stable number from a text (e.g. the photo URL), so all views of one ring share their scene. */
export function seedOf(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return hash;
}

/**
 * The scene of a store category, with one of its variants and camera angles picked by the seed.
 * @param {{ scene: string, sceneVariants: string[] }} category
 * @param {number} seed
 */
export function categoryLook({ scene, sceneVariants }, seed) {
  const variant = sceneVariants.length > 0 ? sceneVariants[seed % sceneVariants.length] : '';
  const camera = CAMERAS[Math.floor(seed / Math.max(sceneVariants.length, 1)) % CAMERAS.length];
  return (
    `Scene: ${scene}.` +
    (variant ? ` In this photo: ${variant}.` : '') +
    ` Light that suits the scene, a gentle specular highlight on the metal and a soft contact shadow under the ring. ${camera} ` +
    'Photorealistic editorial jewelry photography, rich but natural colors, the ring tack sharp. ' +
    'No hands, no people, no text, no logos, no watermark.'
  );
}

/** The cover of a store category: its own world and mood from the scene, never a ring. */
export const categoryCoverPrompt = (scene) =>
  `${scene}. Vertical composition with the most striking detail sharp in the lower middle third. Editorial ` +
  'photography with the light, colors and mood the scene describes. Only the world of the material: no jewelry ' +
  'of any kind, no rings, no hands, no people, no text, no logos, no watermark.';

// A flat backdrop without shadow is what lets the background removal cut the ring out cleanly.
export const CUTOUT_SHOT =
  'Recreate the ring from the reference photo as a single isolated product shot: the ring floats upright in the air, ' +
  'turned about 35 degrees so the outer surface with its inlay and the inside of the band are both visible, and the ' +
  'hole of the ring is open and see-through. ' + KEEP_IDENTICAL + ' ' +
  'Background: fully transparent, nothing but the ring: no backdrop, no surface, no shadow and no reflection. ' +
  'Soft studio light from the upper left with a crisp highlight on the edges. ' +
  'Photorealistic macro jewelry photography, the whole ring tack sharp, centered, filling about 70% of the frame. ' +
  'No hands, no props, no text, no watermark.';

export const STYLE_REFERENCE_NOTE =
  'The last image is a STYLE reference only: match its setting, light, colors and mood. ' +
  'Never copy its ring; the ring must come from the earlier reference photo(s).';

export const TEXT_PROMPT = (notes, hasInfoImage = false) =>
  'You write product copy for emlets, a small handmade ring shop in Fuerteventura (rings turned on a lathe from ' +
  'wood, stone, metal and carbon fiber). Look at the ring and return JSON in Spanish:\n' +
  '- name: 3–7 words, starting with "Anillo", elegant, naming only materials you can actually see.\n' +
  '- description: 1–3 short sentences about the visible materials, colors and style. Do not invent sizes, ' +
  'origins, gemstone names or precious-metal claims unless the maker notes state them.\n' +
  (notes ? `Maker notes (trust these): ${notes}\n` : '') +
  (hasInfoImage
    ? 'The second image is the maker\'s info sheet (a handwritten note or label). Read every detail on it, such as ' +
      'ring size, materials, stones, origin or signs, and trust it like maker notes. Name the size and materials ' +
      'from it in the description.\n'
    : '');

export const TEXT_SCHEMA = {
  type: 'object',
  properties: { name: { type: 'string' }, description: { type: 'string' } },
  required: ['name', 'description'],
};
