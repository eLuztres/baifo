'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { UTApi, UTFile } from 'uploadthing/server';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { absoluteUrl } from '@/lib/brand';
import { SERVER_URL } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n-core';
import { formatError } from '@/lib/utils';
import {
  KEEP_IDENTICAL,
  SHOTS,
  STUDIO_LOOK,
  STYLE_REFERENCE_NOTE,
  categoryCoverPrompt,
  categoryLook,
  seedOf,
} from '@/lib/studio/prompts.mjs';
import { draftText, editImage, generateImage } from '@/lib/studio/openai.mjs';
import { idSchema } from '@/lib/validators';

// A URL path on this shop (public/); the CLI studio's STUDIO_STYLE_IMAGE is a file path instead.
const STYLE_IMAGE_URL = process.env.STUDIO_STYLE_IMAGE_URL || '/brand/studio-style.jpg';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const studioError = (key: TranslationKey) => new Error(key);

// Only photos uploaded through UploadThing, so the server never fetches an arbitrary URL.
// (No .url(): Zod would still run this refine after it failed, and new URL() throws on a '/brand/…' path.)
const photoUrlSchema = z
  .string({ message: 'STUDIO_INVALID_PHOTO' satisfies TranslationKey })
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const { protocol, hostname } = new URL(value);
    return protocol === 'https:' && (hostname === 'utfs.io' || hostname.endsWith('.ufs.sh'));
  }, 'STUDIO_INVALID_PHOTO' satisfies TranslationKey);

// Pictures of older products live in public/brand/; they are fetched from this shop's own server.
const ringPhotoSchema = z.union([photoUrlSchema, z.string().regex(/^\/brand\/[\w\-/]+\.(jpe?g|png|webp)$/i)], {
  errorMap: () => ({ message: 'STUDIO_INVALID_PHOTO' satisfies TranslationKey }),
});

const viewSchema = z.enum(['hero', 'side', 'top']);
const notesSchema = z.string().max(500, 'STUDIO_NOTES_TOO_LONG' satisfies TranslationKey).optional();

async function download(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Studio image ${url} answered ${response.status}`);
    throw studioError('STUDIO_IMAGE_LOAD_FAILED');
  }
  // Checked before reading the body too, so a huge file is never buffered.
  if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) throw studioError('STUDIO_IMAGE_TOO_LARGE');
  const image = new Uint8Array(await response.arrayBuffer());
  if (image.byteLength > MAX_IMAGE_BYTES) throw studioError('STUDIO_IMAGE_TOO_LARGE');
  return image;
}

// Every view of every ring uses the same mood picture, so it is loaded once per server instance.
let styleImage: Uint8Array | undefined;

// The mood picture is optional: without it the scene text alone sets the look.
async function loadStyleImage() {
  try {
    styleImage ??= await download(absoluteUrl(STYLE_IMAGE_URL, SERVER_URL));
    return styleImage;
  } catch {
    return null;
  }
}

async function requireStudioAccess() {
  if (!(await isAdmin())) throw studioError('ERROR_ADMIN_ONLY');
}

type View = z.infer<typeof viewSchema>;
interface Scene {
  scene: string;
  sceneVariants: string[];
}

const VIEWS = viewSchema.options;

// 3:4 portrait, the shape of the shop's ring cards.
const PORTRAIT = { size: '1152x1536', output_format: 'jpeg' };

async function uploadImage(image: Uint8Array, name: string) {
  const [upload] = await new UTApi().uploadFiles([new UTFile([image], `${name}-${Date.now()}.jpg`)]);
  if (!upload.data) {
    console.error('Studio upload failed', upload.error);
    throw studioError('STUDIO_UPLOAD_FAILED');
  }
  return upload.data.ufsUrl;
}

// A category's own scene replaces the salon look and its mood picture; the seed varies it per ring.
async function makeRingView(photo: Uint8Array, view: View, scene: Scene | null, seed: number) {
  const style = scene ? null : await loadStyleImage();
  const look = scene ? categoryLook(scene, seed) : STUDIO_LOOK;
  const prompt = SHOTS[view] + KEEP_IDENTICAL + ' ' + look + (style ? ' ' + STYLE_REFERENCE_NOTE : '');
  const image = await editImage(prompt, style ? [photo, style] : [photo], PORTRAIT);
  return uploadImage(image, `studio-${view}`);
}

const findScene = (categoryId?: string) =>
  categoryId
    ? prisma.category.findUnique({ where: { id: idSchema.parse(categoryId) }, select: { scene: true, sceneVariants: true } })
    : null;

/** One AI view of the ring in the photo, in the scene of its store category, uploaded to UploadThing. */
export async function generateRingView(photoUrl: string, view: string, categoryId?: string) {
  try {
    await requireStudioAccess();
    const url = photoUrlSchema.parse(photoUrl);
    const [photo, scene] = await Promise.all([download(url), findScene(categoryId)]);
    return { success: true, message: '', url: await makeRingView(photo, viewSchema.parse(view), scene, seedOf(url)) };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Redoes all views of a ring in the scene of its first store category; the old pictures are kept for undo. */
export async function regenerateRingViews(productId: string) {
  try {
    await requireStudioAccess();
    const product = await prisma.product.findUnique({
      where: { id: idSchema.parse(productId) },
      select: {
        slug: true,
        images: true,
        sourceImage: true,
        categories: { orderBy: { sortOrder: 'asc' }, take: 1, select: { scene: true, sceneVariants: true } },
      },
    });
    if (!product) throw studioError('ERROR_NOT_FOUND');
    const source = product.sourceImage ?? product.images[0];
    if (!source) throw studioError('STUDIO_NEED_PHOTO');

    const photo = await download(absoluteUrl(ringPhotoSchema.parse(source), SERVER_URL));
    const scene = product.categories[0] ?? null;
    const images = await Promise.all(VIEWS.map((view) => makeRingView(photo, view, scene, seedOf(product.slug))));
    await prisma.product.update({
      where: { id: productId },
      data: { images, previousImages: product.images, sourceImage: source },
    });
    revalidatePath('/', 'layout');
    return { success: true, message: '' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** A cover picture for a store category from its scene, not saved until the category is. */
export async function generateCategoryCover(scene: string) {
  try {
    await requireStudioAccess();
    const text = z.string().trim().min(10, 'VALIDATION_CATEGORY_SCENE' satisfies TranslationKey).max(600).parse(scene);
    const image = await generateImage(categoryCoverPrompt(text), PORTRAIT);
    return { success: true, message: '', url: await uploadImage(image, 'category') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Product name and description for the ring in the photo, plus what the optional info photo says. */
export async function draftRingText(photoUrl: string, notes?: string, infoUrl?: string) {
  try {
    await requireStudioAccess();
    const makerNotes = notesSchema.parse(notes);
    const [photo, info] = await Promise.all([
      download(absoluteUrl(ringPhotoSchema.parse(photoUrl), SERVER_URL)),
      infoUrl ? download(photoUrlSchema.parse(infoUrl)) : null,
    ]);
    const text = await draftText(photo, makerNotes, info);
    return { success: true, message: '', name: text.name ?? '', description: text.description ?? '' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
