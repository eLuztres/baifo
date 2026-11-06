'use server';

import { z } from 'zod';
import { UTApi, UTFile } from 'uploadthing/server';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { absoluteUrl } from '@/lib/brand';
import { SERVER_URL } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n-core';
import { aiErrorText } from '@/lib/ai-errors';
import { getT } from '@/lib/i18n-server';
import { formatError } from '@/lib/utils';
import { coverPrompt, coverLikeOthersPrompt } from '@/lib/studio/prompts.mjs';
import { editImage, generateImage } from '@/lib/ai-usage';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const studioError = (key: TranslationKey) => new Error(key);

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

async function requireStudioAccess() {
  if (!(await isAdmin())) throw studioError('ERROR_ADMIN_ONLY');
}

// 3:4 portrait, the shape of the shop's cards.
const PORTRAIT = { size: '1152x1536', output_format: 'jpeg' };

async function uploadImage(image: Uint8Array, name: string) {
  // UploadThing unreachable (e.g. a blocked network) rejects instead of answering: same friendly message.
  const [upload] = await new UTApi().uploadFiles([new UTFile([image], `${name}-${Date.now()}.jpg`)]).catch((error) => {
    console.error('Studio upload failed', error);
    throw studioError('STUDIO_UPLOAD_FAILED');
  });
  if (!upload.data) {
    console.error('Studio upload failed', upload.error);
    throw studioError('STUDIO_UPLOAD_FAILED');
  }
  return upload.data.ufsUrl;
}

// Covers of other Mercadillos the new one is made to match.
const MAX_COVER_REFERENCES = 2;

/** A cover for a Mercadillo, not saved until it is: like the others' covers when there are some, else from the words alone. */
export async function generateGroupCover(description: string, name = '') {
  try {
    await requireStudioAccess();
    const text = z.string().trim().max(600).parse(description);
    const title = z.string().trim().max(60).parse(name);
    if (text.length < 3 && title.length < 2) throw studioError('VALIDATION_GROUP_COVER');
    const others = await prisma.mercadillo.findMany({
      where: { image: { not: null } },
      orderBy: { sortOrder: 'asc' },
      take: MAX_COVER_REFERENCES,
      select: { image: true },
    });
    // A cover that can't be loaded is just left out of the references.
    const references = await Promise.all(
      others.flatMap(({ image }) => (image ? [download(absoluteUrl(image, SERVER_URL)).catch(() => null)] : []))
    );
    const styles = references.flatMap((image) => (image ? [image] : []));
    const image =
      styles.length > 0
        ? await editImage(coverLikeOthersPrompt(title, text), styles, PORTRAIT)
        : await generateImage(coverPrompt(text || title), PORTRAIT);
    return { success: true, message: '', url: await uploadImage(image, 'cover') };
  } catch (error) {
    return { success: false, message: aiErrorText((await getT()).t, error) ?? formatError(error) };
  }
}
