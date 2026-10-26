import { useState } from 'react';
import { isVideoUrl } from '@/lib/video';

type MediaState = 'image' | 'video' | 'failed';

// Uploaded files have no extension; once one played as a video, later mounts start as video.
const knownVideos = new Set<string>();

/**
 * Picks the element for a product media URL without downloading it first, so the image is
 * in the server HTML. A failing image is retried as a video, a failing video ends as 'failed'.
 */
export function useMedia(src: string) {
    const [fallback, setFallback] = useState<{ src: string; state: MediaState }>();
    const guessed: MediaState = isVideoUrl(src) || knownVideos.has(src) ? 'video' : 'image';
    const state = fallback?.src === src ? fallback.state : guessed;

    const handleError = () => setFallback({ src, state: state === 'image' ? 'video' : 'failed' });
    const handleVideoLoaded = () => knownVideos.add(src);

    return { state, handleError, handleVideoLoaded };
}
