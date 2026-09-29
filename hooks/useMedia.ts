import { useEffect, useState } from 'react';

type MediaType = 'image' | 'video' | 'unknown';

const mediaCache = new Map<string, { type: MediaType; blobUrl?: string }>();

export function useMedia(src: string) {
    const [mediaType, setMediaType] = useState<MediaType>('unknown');
    const [mediaUrl, setMediaUrl] = useState<string>(src);

    useEffect(() => {
        let isMounted = true;

        async function fetchMedia() {
            if (mediaCache.has(src)) {
                const cached = mediaCache.get(src)!;
                if (isMounted) {
                    setMediaType(cached.type);
                    if (cached.blobUrl) setMediaUrl(cached.blobUrl);
                }
                return;
            }

            try {
                const res = await fetch(src);
                const contentType = res.headers.get('Content-Type') || '';
                let type: MediaType = 'unknown';

                if (contentType.startsWith('video/')) type = 'video';
                if (contentType.startsWith('image/')) type = 'image';

                let blobUrl: string | undefined;
                if (type === 'video') {
                    const blob = await res.blob();
                    blobUrl = URL.createObjectURL(blob);
                }

                mediaCache.set(src, { type, blobUrl });
                if (isMounted) {
                    setMediaType(type);
                    if (blobUrl) setMediaUrl(blobUrl);
                }
            } catch (err) {
                console.error('Failed to load media:', err);
                if (isMounted) {
                    setMediaType('unknown');
                    setMediaUrl(src); // fallback to original
                }
            }
        }

        setMediaType('unknown'); // reset
        setMediaUrl(src);
        void fetchMedia();

        return () => {
            isMounted = false;
        };
    }, [src]);

    return { mediaType, mediaUrl };
}
