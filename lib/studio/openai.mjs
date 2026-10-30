// OpenAI calls of the AI product studio (plain fetch, no SDK), shared by the studio script and the admin studio.
// Env is read on each call: the script loads .env only after its imports have run.
import { TEXT_PROMPT, TEXT_SCHEMA } from './prompts.mjs';

const OPENAI_URL = 'https://api.openai.com/v1';

// Uploaded photos can be PNG; everything else here is JPEG.
const mimeOf = (image) => (image[0] === 0x89 && image[1] === 0x50 ? 'image/png' : 'image/jpeg');

const textModel = () => process.env.OPENAI_TEXT_MODEL || 'gpt-6-astra';

/** @typedef {(call: { endpoint: string, model: string, usage: any, purpose?: string }) => Promise<void>} UsageListener */

/** @type {UsageListener | null} */
let usageListener = null;

/**
 * Lets the app save every call's token usage (the admin's AI costs); the studio script has none.
 * @param {UsageListener} listener
 */
export const onUsage = (listener) => {
  usageListener = listener;
};

// Where OpenAI says which rule a refused request broke, e.g. "… safety_violations=[sexual]."
const SAFETY_VIOLATIONS = /safety_violations=\[([^\]]*)\]/;
const REFUSAL_CODES = ['moderation_blocked', 'content_policy_violation', 'content_filter'];
const NO_CREDIT_CODES = ['insufficient_quota', 'billing_hard_limit_reached', 'billing_not_active'];

/**
 * What kind of failure an OpenAI answer is (aiKind), and OpenAI's own words for it (aiReason), so the admin is told
 * what happened instead of "something went wrong" (lib/ai-errors.ts says it in their language).
 */
function aiFailure(status, error) {
  const message = (error?.message ?? '').replace(/\s*If you believe this is an error.*$/s, '').trim();
  const refused = REFUSAL_CODES.includes(error?.code) || /safety system/i.test(message);
  const aiKind = refused
    ? 'refused'
    : NO_CREDIT_CODES.includes(error?.code)
      ? 'no_credit'
      : status === 401
        ? 'invalid_key'
        : status === 429
          ? 'busy'
          : status >= 500
            ? 'unavailable'
            : 'unknown';
  // The rules sit at the very end, after the part cut from `message`.
  const aiReason = refused ? (error?.message?.match(SAFETY_VIOLATIONS)?.[1] ?? '') : aiKind === 'unknown' ? message : '';
  return Object.assign(new Error(`${status} ${error?.message ?? ''}`.trim()), { status, code: error?.code, aiKind, aiReason });
}

async function openai(endpoint, body, purpose) {
  if (!process.env.OPENAI_API_KEY) throw Object.assign(new Error('OPENAI_API_KEY is missing in .env'), { aiKind: 'not_configured' });
  const isForm = body instanceof FormData;
  const response = await fetch(`${OPENAI_URL}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...(isForm ? {} : { 'Content-Type': 'application/json' }) },
    body: isForm ? body : JSON.stringify(body),
  }).catch((error) => {
    // fetch itself only fails when OpenAI can't be reached: no internet, DNS, a firewall.
    throw Object.assign(new Error(`OpenAI not reachable: ${error.cause?.code ?? error.message}`), { aiKind: 'offline' });
  });
  const result = await response.json().catch(() => ({}));
  // status and code also let checkCredit tell "no credit left" from other errors.
  if (!response.ok) throw aiFailure(response.status, result.error);
  const model = isForm ? body.get('model') : body.model;
  // Saving the costs must never break the AI call itself.
  await usageListener?.({ endpoint, model, usage: result.usage, purpose }).catch((error) => console.error('AI usage not saved', error));
  return result;
}

/**
 * The edit endpoint keeps the ring from the reference photos instead of inventing one from words.
 * @param {string} prompt
 * @param {Uint8Array[]} references JPEG or PNG images
 * @param {Record<string, string>} options e.g. { size: '1152x1536' }
 */
export async function editImage(prompt, references, options) {
  const form = new FormData();
  form.set('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare');
  form.set('prompt', prompt);
  form.set('quality', process.env.OPENAI_IMAGE_QUALITY || 'high');
  for (const [name, value] of Object.entries(options)) form.set(name, value);
  references.forEach((image, index) => form.append('image[]', new Blob([image], { type: mimeOf(image) }), `reference-${index}`));
  const { data } = await openai('/images/edits', form);
  if (!data?.[0]?.b64_json) throw Object.assign(new Error('No image returned'), { aiKind: 'unknown', aiReason: 'No image returned' });
  return Buffer.from(data[0].b64_json, 'base64');
}

/**
 * A picture from words alone, for scenes that must not copy a reference.
 * @param {string} prompt
 * @param {Record<string, string>} options e.g. { size: '1152x1536' }
 */
export async function generateImage(prompt, options) {
  const { data } = await openai('/images/generations', {
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare',
    prompt,
    quality: process.env.OPENAI_IMAGE_QUALITY || 'high',
    ...options,
  });
  if (!data?.[0]?.b64_json) throw Object.assign(new Error('No image returned'), { aiKind: 'unknown', aiReason: 'No image returned' });
  return Buffer.from(data[0].b64_json, 'base64');
}

/**
 * Product name and description from a photo of the product.
 * @param {Uint8Array | null} photo JPEG or PNG image; null for text-only work such as translating
 * @param {string} [notes] maker notes the text must trust
 * @param {Uint8Array | null} [infoImage] photo of the maker's note or label, read like the notes
 * @param {{ prompt?: string, schema?: object, isWebSearch?: boolean }} [format] another prompt and JSON schema than the product text's; isWebSearch lets it look the product up
 * @returns {Promise<{ name?: string, description?: string } & Record<string, unknown>>}
 */
export async function draftText(photo, notes, infoImage = null, format = {}) {
  const response = await openai('/responses', {
    model: textModel(),
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: format.prompt ?? TEXT_PROMPT(notes, Boolean(infoImage)) },
          ...[photo, infoImage]
            .filter(Boolean)
            .map((image) => ({ type: 'input_image', image_url: `data:${mimeOf(image)};base64,${Buffer.from(image).toString('base64')}` })),
        ],
      },
    ],
    ...(format.isWebSearch && { tools: [{ type: 'web_search' }] }),
    text: { format: { type: 'json_schema', name: 'product_text', strict: true, schema: { ...(format.schema ?? TEXT_SCHEMA), additionalProperties: false } } },
  });
  const text = response.output?.flatMap((item) => item.content ?? []).find((part) => part.type === 'output_text')?.text;
  return JSON.parse(text ?? '{}');
}

/**
 * A voice note as text, for admin fields that are quicker said than typed.
 * @param {Blob} audio a browser recording (webm, mp4, ogg …)
 * @param {string} [language] ISO 639-1 hint, e.g. 'es'
 */
export async function transcribeAudio(audio, language) {
  const form = new FormData();
  form.set('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe');
  form.set('file', audio, `voice.${audioExtension(audio.type)}`);
  if (language) form.set('language', language);
  const { text } = await openai('/audio/transcriptions', form);
  return typeof text === 'string' ? text.trim() : '';
}

// OpenAI tells the format by the file name; iPhones record mp4, most other browsers webm.
const audioExtension = (type) => (type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : 'webm');

/**
 * Whether OpenAI can be used right now: a tiny text call costing a fraction of a cent.
 * @returns {Promise<'ok' | 'no_credit' | 'invalid_key' | 'not_configured' | 'unknown'>}
 */
export async function checkCredit() {
  if (!process.env.OPENAI_API_KEY) return 'not_configured';
  try {
    await openai('/responses', { model: textModel(), input: 'Reply with OK.', max_output_tokens: 16 }, 'check');
    return 'ok';
  } catch (error) {
    if (error.aiKind === 'no_credit') return 'no_credit';
    if (error.status === 401) return 'invalid_key';
    return 'unknown';
  }
}
