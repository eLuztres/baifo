'use client';

import { useTranslateMessage } from '@/components/i18n-provider';
import styles from './LoaderImage.module.css';

type LayerKind = 'face' | 'side' | 'inlay';

// Stacked flat rings in CSS 3D space give the band real thickness: grained wooden faces, a steel liner inside,
// and a turquoise channel around the middle of the outside, like the shop's own wood-and-stone rings.
const LAYER_DEPTHS = Array.from({ length: 19 }, (_, i) => i - 9);
const FACE_DEPTH = 9;
const INLAY_DEPTH = 3;
// Long, uneven strokes a little in and out of the band's middle, so the face reads as calm wood grain.
const GRAIN_LINES = [
    { r: 44, dash: '46 10 70 14', opacity: 0.35 },
    { r: 47.5, dash: '90 18 40 9', opacity: 0.22 },
    { r: 51, dash: '30 12 85 16', opacity: 0.3 },
];

function getLayerKind(depth: number): LayerKind {
    if (Math.abs(depth) === FACE_DEPTH) return 'face';
    return Math.abs(depth) <= INLAY_DEPTH ? 'inlay' : 'side';
}

function RingLayer({ kind, depth }: { kind: LayerKind; depth: number }) {
    return (
        <svg viewBox='0 0 150 150' className={styles.layer} aria-hidden='true'>
            {kind === 'face' ? (
                <>
                    <circle cx='75' cy='75' r='49' fill='none' stroke='url(#loader-wood)' strokeWidth='14' />
                    {GRAIN_LINES.map((line) => (
                        <circle
                            key={line.r}
                            cx='75'
                            cy='75'
                            r={line.r}
                            fill='none'
                            className={styles.grain}
                            strokeWidth='0.9'
                            strokeOpacity={line.opacity}
                            strokeDasharray={line.dash}
                        />
                    ))}
                    <circle cx='75' cy='75' r='56' fill='none' className={styles.edge} strokeWidth='1' />
                    <circle cx='75' cy='75' r='41' fill='none' stroke='url(#loader-steel)' strokeWidth='2.6' />
                    <g mask='url(#loader-band)'>
                        <rect x='-40' y='0' width='40' height='150' fill='url(#loader-shine)' className={styles.shine} />
                    </g>
                </>
            ) : kind === 'inlay' ? (
                // The stone sits in a channel on the outside; alternating shades read as crushed turquoise.
                <>
                    <circle cx='75' cy='75' r='47' fill='none' strokeWidth='12' className={styles.woodSide} />
                    <circle cx='75' cy='75' r='54.5' fill='none' strokeWidth='3' className={depth % 2 ? styles.inlay : styles.inlayLight} />
                    <circle cx='75' cy='75' r='41' fill='none' strokeWidth='2.6' className={styles.steelSide} />
                </>
            ) : (
                <>
                    <circle cx='75' cy='75' r='48.5' fill='none' strokeWidth='15' className={styles.woodSide} />
                    <circle cx='75' cy='75' r='41' fill='none' strokeWidth='2.6' className={styles.steelSide} />
                </>
            )}
        </svg>
    );
}

interface LoaderImageProps {
    /** The shop's own loader picture (BRAND_LOADER_IMAGE): it hops instead of the turning ring. */
    image?: string;
}

// useTranslateMessage instead of useI18n: it also renders outside <I18nProvider> (Storybook).
const LoaderImage = ({ image }: LoaderImageProps) => {
    const translate = useTranslateMessage();
    if (image) {
        return (
            <div role='status' aria-label={translate('LOADING')} className={styles.hopStage}>
                {/* eslint-disable-next-line @next/next/no-img-element -- any size or format from .env, no optimization needed */}
                <img src={image} alt='' className={styles.hopper} />
                <span className={styles.hopShadow} aria-hidden='true' />
            </div>
        );
    }
    return (
        <div role='status' aria-label={translate('LOADING')} className={styles.stage}>
            <svg width='0' height='0' className={styles.defs} aria-hidden='true'>
                <defs>
                    <linearGradient id='loader-wood' x1='0' y1='0' x2='1' y2='1'>
                        <stop offset='0%' className={styles.woodDark} />
                        <stop offset='30%' className={styles.wood} />
                        <stop offset='50%' className={styles.woodLight} />
                        <stop offset='70%' className={styles.wood} />
                        <stop offset='100%' className={styles.woodDark} />
                    </linearGradient>
                    <linearGradient id='loader-steel' x1='0' y1='0' x2='1' y2='1'>
                        <stop offset='0%' className={styles.steelDark} />
                        <stop offset='50%' className={styles.steelLight} />
                        <stop offset='100%' className={styles.steelDark} />
                    </linearGradient>
                    <linearGradient id='loader-shine' x1='0' y1='0' x2='1' y2='0'>
                        <stop offset='0%' stopColor='white' stopOpacity='0' />
                        <stop offset='50%' stopColor='white' stopOpacity='0.35' />
                        <stop offset='100%' stopColor='white' stopOpacity='0' />
                    </linearGradient>
                    <mask id='loader-band'>
                        <circle cx='75' cy='75' r='49' fill='none' stroke='white' strokeWidth='14' />
                    </mask>
                </defs>
            </svg>

            <div className={styles.glow} />

            <div className={styles.ring}>
                {LAYER_DEPTHS.map((depth) => (
                    <div key={depth} className={styles.layerWrap} style={{ transform: `translateZ(${depth}em)` }}>
                        <RingLayer kind={getLayerKind(depth)} depth={depth} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LoaderImage;
