'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import LoaderImage from '@/components/shared/LoaderImage';
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
}

export default function ProductMedia({
                                         src,
                                         alt = '',
                                         width = 100,
                                         height = 100,
                                         fill = false,
                                         sizes,
                                         className,
                                         poster
                                     }: ProductMediaProps) {
    const { mediaType, mediaUrl } = useMedia(src);
    const wrapperStyle = fill ? undefined : { width, height };
    const wrapperClass = fill ? 'absolute inset-0 overflow-hidden' : 'overflow-hidden rounded-sm';

    if (mediaType === 'unknown') {
        return (
            <div
                className={cn(wrapperClass, 'flex animate-pulse items-center justify-center bg-muted')}
                style={wrapperStyle}
            >
                {!fill && <LoaderImage />}
            </div>
        );
    }

    return (
        <div style={wrapperStyle} className={wrapperClass}>
            {mediaType === 'video' ? (
                <video
                    className={cn('object-cover object-center w-full h-full', className)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    poster={poster}
                >
                    <source src={mediaUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            ) : fill ? (
                <Image
                    src={mediaUrl}
                    alt={alt}
                    fill
                    sizes={sizes ?? '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'}
                    className={cn('object-cover object-center', className)}
                />
            ) : (
                <Image
                    src={mediaUrl}
                    alt={alt}
                    width={width}
                    height={height}
                    className={cn('object-cover object-center', className)}
                />
            )}
        </div>
    );
}
