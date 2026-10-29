'use client';

import type { ComponentProps, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { slideTo, type SlideDirection } from './slide-navigation';

interface SlideLinkProps extends ComponentProps<typeof Link> {
  href: string;
  direction: SlideDirection;
  /** An element only the new page has, e.g. `[data-feed-page]`: the slide starts once it's there. */
  readySelector: string;
}

/** A link that slides to its page (slide-navigation.ts); new tabs and modified clicks stay plain links. */
export default function SlideLink({ href, direction, readySelector, onClick, ...props }: SlideLinkProps) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    const isModified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (event.defaultPrevented || isModified) return;
    event.preventDefault();
    slideTo(router, href, direction, readySelector);
  };

  return <Link href={href} onClick={handleClick} {...props} />;
}
