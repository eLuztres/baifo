import { UTApi, UTFile } from 'uploadthing/server';
import { prisma } from '@/db/prisma';
import { uploadthingKey, videoPoster, videoSource } from '@/lib/video';
import { downloadMedia } from '@/lib/whatsapp-cloud/client';

const EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4' };

/** Stores a picture (or a cleaned-up video) in UploadThing and returns its permanent URL. */
export async function uploadImage(data: Buffer, name: string, mimeType = 'image/jpeg') {
  const extension = EXTENSIONS[mimeType] ?? 'jpg';
  const [upload] = await new UTApi().uploadFiles([new UTFile([data], `${name}-${Date.now()}.${extension}`, { type: mimeType })]);
  if (!upload.data) throw new Error(`Upload failed: ${upload.error?.message ?? 'unknown error'}`);
  return upload.data.ufsUrl;
}

/** WhatsApp media expires within minutes of the message, so the photos are copied right away. */
export async function storeWhatsappPhoto(mediaId: string, submissionId: string) {
  const { data, mimeType } = await downloadMedia(mediaId);
  return uploadImage(data, `submission-${submissionId}`, mimeType);
}

export async function fetchImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// A video address carries its still frame (#video=…): both are files of their own.
const fileKeysOf = (urls: (string | null)[]) =>
  urls.flatMap((url) => (url ? [videoSource(url), videoPoster(url)] : [])).flatMap((file) => (file && uploadthingKey(file)) || []);

/** A deleted listing's photos leave UploadThing too, unless another listing or Mercadillo still shows the same file. */
export async function deleteListingFiles(stored: string[]) {
  const keys = new Set(fileKeysOf(stored));
  if (keys.size === 0) return;
  // Every other row's files, compared by key: the same file can be stored as a photo, a still or under another host.
  const [submissions, products, mercadillos] = await Promise.all([
    prisma.submission.findMany({ select: { rawImages: true, images: true, aiImages: true } }),
    prisma.product.findMany({ select: { images: true } }),
    prisma.mercadillo.findMany({ select: { image: true, icon: true } }),
  ]);
  const stillUsed = fileKeysOf([
    ...submissions.flatMap((row) => [...row.rawImages, ...row.images, ...row.aiImages]),
    ...products.flatMap((row) => row.images),
    ...mercadillos.flatMap((row) => [row.image, row.icon]),
  ]);
  for (const key of stillUsed) keys.delete(key);
  if (keys.size > 0) await new UTApi().deleteFiles([...keys]);
}
