'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { cn } from '@/lib/utils';
import styles from './scene-hero.module.css';

export interface MercadilloLink {
  slug: string;
  name: string;
  icon: string | null;
}

interface MercadilloGridProps {
  mercadillos: MercadilloLink[];
  label: string;
}

// Two rows of three: the most a small phone has room for between the button and the ad.
const PER_PAGE = 6;

/** The Mercadillos as round pictures on the start page; more than six turn into pages that swipe sideways, with dots. */
export default function MercadilloGrid({ mercadillos, label }: MercadilloGridProps) {
  const [page, setPage] = useState(0);
  if (mercadillos.length === 0) return null;
  const pages = Array.from({ length: Math.ceil(mercadillos.length / PER_PAGE) }, (_, index) =>
    mercadillos.slice(index * PER_PAGE, (index + 1) * PER_PAGE));

  return (
    <nav aria-label={label} className={styles.mercadillos}>
      <div
        className={styles.mercadilloPages}
        onScroll={(event) => setPage(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
      >
        {pages.map((items, index) => (
          <ul key={index} className={styles.mercadilloPage}>
            {items.map((mercadillo) => (
              <li key={mercadillo.slug} className={styles.mercadilloItem}>
                <Link href={`/explore?mercadillo=${mercadillo.slug}`} className={styles.mercadillo}>
                  <span className={styles.mercadilloRing}>
                    <MercadilloIcon src={mercadillo.icon} sizes='4rem' className={styles.mercadilloIcon} />
                  </span>
                  <span className={styles.mercadilloName}>{mercadillo.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
      {pages.length > 1 && (
        <div className={styles.mercadilloDots} aria-hidden>
          {pages.map((_, index) => (
            <span key={index} className={cn(styles.mercadilloDot, index === page && styles.mercadilloDotActive)} />
          ))}
        </div>
      )}
    </nav>
  );
}
