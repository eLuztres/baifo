'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useMedia } from '@/hooks/useMedia';

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
                                         loading
                                     }: ProductMediaProps) {
    const { state, handleError, handleVideoLoaded } = useMedia(src);
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
                    src={src}
                    aria-label={alt || undefined}
                    className={cn('object-cover object-center w-full h-full', className)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    poster={poster}
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
