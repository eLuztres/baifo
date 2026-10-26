import { UTApi, UTFile } from 'uploadthing/server';
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
