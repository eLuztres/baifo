// UploadThing URLs carry no file extension, so an uploaded video is marked with this fragment (never sent to the server).
// It can carry the video's still frame, #video=<still URL>: the picture wherever a video can't play (WhatsApp, email, previews).
export const VIDEO_MARK = '#video';

const VIDEO_URL = /\.(mp4|webm|mov|m4v)([?#]|$)|#video(=[^#]*)?$/i;

export const isVideoUrl = (url: string) => VIDEO_URL.test(url);

/** The uploaded file's URL, marked when the file is a video (with its still frame, when there is one). */
export const mediaUrl = (url: string, type: string, still?: string) =>
  type.startsWith('video/') ? `${url}${VIDEO_MARK}${still ? `=${encodeURIComponent(still)}` : ''}` : url;

/** The still frame a video URL carries, if any. */
export function videoPoster(url: string) {
  const still = url.match(/#video=([^#]+)$/)?.[1];
  return still ? decodeURIComponent(still) : undefined;
}

/** The file itself, without the mark: what a <video> loads. */
export const videoSource = (url: string) => url.split('#')[0];

/** The picture for places that only show pictures: a photo itself, a video's still frame, or none. */
export const pictureOf = (url: string) => (isVideoUrl(url) ? videoPoster(url) : url);

/** The cover of a listing for cards, messages and previews: its first picture, a first video's still counting as one. */
export const coverPicture = (media: string[]) => media.map(pictureOf).find(Boolean);

// iPhones sometimes never fire a video's events for a file that isn't on the page: without a limit the upload hung at 100%.
const STILL_TIMEOUT_MS = 8000;
// An iPhone video is 4K; a cover doesn't need more.
const STILL_MAX_WIDTH = 1280;

/** A JPEG of the video at about one second, taken in the browser: the cover of a listing with only videos and no AI. */
export function videoStill(file: File): Promise<File | null> {
  const giveUp = new Promise<null>((resolve) => setTimeout(() => resolve(null), STILL_TIMEOUT_MS));
  return Promise.race([takeStill(file), giveUp]);
}

async function takeStill(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    // loadedmetadata, not loadeddata: iOS Safari fires the first without playing, the second often never.
    const ready = new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });
    video.src = url;
    video.load();
    await ready;
    const seeked = new Promise((resolve) => (video.onseeked = resolve));
    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await seeked;
    const scale = Math.min(1, STILL_MAX_WIDTH / (video.videoWidth || STILL_MAX_WIDTH));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob && new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    // A format this browser can't play: no still, the video itself is the cover.
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
