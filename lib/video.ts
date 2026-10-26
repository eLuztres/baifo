// UploadThing URLs carry no file extension, so an uploaded video is marked with this fragment (never sent to the server).
export const VIDEO_MARK = '#video';

const VIDEO_URL = /\.(mp4|webm|mov|m4v)([?#]|$)|#video$/i;

export const isVideoUrl = (url: string) => VIDEO_URL.test(url);

/** The uploaded file's URL, marked when the file is a video. */
export const mediaUrl = (url: string, type: string) => (type.startsWith('video/') ? `${url}${VIDEO_MARK}` : url);

/** A JPEG of the video at about one second, taken in the browser: the cover of a listing with only videos and no AI. */
export async function videoStill(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve;
      video.onerror = reject;
    });
    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await new Promise((resolve) => (video.onseeked = resolve));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob && new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    // A format this browser can't play: no still, the video itself is the cover.
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
