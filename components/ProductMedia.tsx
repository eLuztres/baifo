'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useMedia } from '@/hooks/useMedia';
import { videoPoster, videoSource } from '@/lib/video';

interface ProductMediaProps {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    /** Fill the parent container (parent must be positioned and sized). */
    fill?: boolean;
    sizes?: string;
    className?: string;
    poster?: string;
    /** For the photo that is the page's largest paint: loaded first instead of lazily. */
    priority?: boolean;
    /** 'eager' loads the photo right away even when it's out of view, e.g. a row the visitor is about to scroll through. */
    loading?: 'eager' | 'lazy';
    /** A video shows only its first frame and loads just enough for it (thumbnails, blurred backdrops). */
    isStill?: boolean;
    /** A video plays only while it is on screen, and loads nothing before (a feed full of cards). */
    playsWhenVisible?: boolean;
}

export default function ProductMedia({
                                         src,
                                         alt = '',
                                         width = 100,
                                         height = 100,
                                         fill = false,
                                         sizes,
                                         className,
                                         poster,
                                         priority = false,
                                         loading,
                                         isStill = false,
                                         playsWhenVisible = false
                                     }: ProductMediaProps) {
    const { state, handleError, handleVideoLoaded } = useMedia(src);
    const videoRef = useRef<HTMLVideoElement>(null);
    // The still frame the upload saved in the video's URL (lib/video.ts).
    const posterUrl = poster ?? videoPoster(src);

    useEffect(() => {
        const video = videoRef.current;
        if (!playsWhenVisible || !video) return;
        const observer = new IntersectionObserver(
            ([entry]) => (entry.isIntersecting ? video.play().catch(() => undefined) : video.pause()),
            { threshold: 0.5 }
        );
        observer.observe(video);
        return () => observer.disconnect();
    }, [playsWhenVisible, state]);
    const wrapperStyle = fill ? undefined : { width, height };
    const wrapperClass = fill ? 'absolute inset-0 overflow-hidden' : 'overflow-hidden rounded-sm';

    // A quiet empty tile instead of the browser's broken-image icon.
    if (state === 'failed') {
        return (
            <div
                role={alt ? 'img' : undefined}
                aria-label={alt || undefined}
                className={cn(wrapperClass, 'bg-muted')}
                style={wrapperStyle}
            />
        );
    }

    return (
        <div style={wrapperStyle} className={wrapperClass}>
            {state === 'video' ? (
                <video
                    ref={videoRef}
                    // #t: without a still, Safari paints the frame at that time instead of a black box.
                    src={isStill && !posterUrl ? `${videoSource(src)}#t=0.1` : videoSource(src)}
                    aria-label={alt || undefined}
                    className={cn('object-cover object-center w-full h-full', className)}
                    autoPlay={!isStill && !playsWhenVisible}
                    loop
                    muted
                    playsInline
                    // With a still frame a preview loads nothing of the video; a feed card only once it's on screen.
                    preload={playsWhenVisible || (isStill && posterUrl) ? 'none' : isStill ? 'metadata' : 'auto'}
                    poster={posterUrl}
                    onError={handleError}
                    onLoadedData={handleVideoLoaded}
                />
            ) : fill ? (
                <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes={sizes ?? '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'}
                    priority={priority}
                    loading={loading}
                    className={cn('object-cover object-center', className)}
                    onError={handleError}
                />
            ) : (
                <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    priority={priority}
                    loading={loading}
                    className={cn('object-cover object-center', className)}
                    onError={handleError}
                />
            )}
        </div>
    );
}
