// What the upload route takes (app/api/uploadthing/core.ts).
const UPLOADABLE_TYPES = ['image/jpeg', 'image/png'];
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
// Sharp enough for the product zoom; a phone photo's 12 to 48 megapixels are far over the size limit.
const MAX_PHOTO_EDGE = 2560;
const JPEG_QUALITY = 0.85;

const isPhoto = (file: File) => file.type.startsWith('image/') || /\.hei[cf]$/i.test(file.name);

const needsConverting = (file: File) =>
  isPhoto(file) && (!UPLOADABLE_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES);

/** The photo as a JPEG of at most MAX_PHOTO_EDGE pixels; the original when this browser can't read it. */
async function toJpeg(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    // Chrome and Firefox can't read HEIC; the upload then fails as before.
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Turns iPhone photos (HEIC, or JPEGs over the limit) into JPEGs the upload accepts, before they're sent.
 * The browser reads the photo itself, so Safari on the iPhone and Mac handles HEIC.
 */
export const preparePhotos = (files: File[]) =>
  Promise.all(files.map((file) => (needsConverting(file) ? toJpeg(file) : file)));
