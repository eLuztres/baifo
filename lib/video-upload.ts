import { mediaUrl, videoStill } from '@/lib/video';

/** What an UploadThing startUpload gives back, as far as this needs it. */
type StartUpload = (files: File[]) => Promise<{ name: string; ufsUrl: string; type: string }[] | undefined>;

const baseName = (name: string) => name.replace(/\.[^.]+$/, '');

/** Uploads videos with a still frame of each, so a video can be a listing's cover: its URL carries the still. */
export async function uploadVideos(videos: File[], uploadVideo: StartUpload, uploadPhoto: StartUpload): Promise<string[]> {
  const [uploaded, stills] = await Promise.all([uploadVideo(videos), Promise.all(videos.map(videoStill))]);
  const stillFiles = stills.filter((still): still is File => Boolean(still));
  const uploadedStills = stillFiles.length > 0 ? ((await uploadPhoto(stillFiles)) ?? []) : [];
  // Each still is named after its video (clip.mov → clip.jpg).
  const stillOf = new Map(uploadedStills.map((still) => [baseName(still.name), still.ufsUrl]));
  return (uploaded ?? []).map((file) => mediaUrl(file.ufsUrl, file.type, stillOf.get(baseName(file.name))));
}
