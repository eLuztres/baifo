'use client';

import { type MouseEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { focusSection, ONE_PAGE_PATH, scrollToSection, SECTION_IDS } from '@/components/shared/home/one-page';
import { cn } from '@/lib/utils';
import type { NavLink } from './nav-items';
import { useActiveNavIndex } from './use-active-section';

interface NavLinksProps {
  links: NavLink[];
  /** Pages of their own after the home's parts (e.g. the offers), only in the desktop bar; the phone menu lists them. */
  pageLinks?: { href: string; label: string }[];
  /** `pills` is the desktop bar; `row` is the slim row on small screens that shows briefly when the part changes. */
  variant?: 'pills' | 'row';
}

const ROW_SHOW_MS = 900;
const USER_INPUT_EVENTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;

/** True for a short while after the user moves the page to another part; the load and its hash jump don't count. */
function useIsShownOnPartChange(activeIndex: number) {
  const [isShown, setIsShown] = useState(false);
  const previousIndex = useRef(activeIndex);
  const hasUserInput = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const markInput = () => {
      hasUserInput.current = true;
    };
    USER_INPUT_EVENTS.forEach((type) => window.addEventListener(type, markInput, { passive: true }));
    return () => {
      clearTimeout(hideTimer.current);
      USER_INPUT_EVENTS.forEach((type) => window.removeEventListener(type, markInput));
    };
  }, []);

  useEffect(() => {
    if (activeIndex === previousIndex.current) return;
    previousIndex.current = activeIndex;
    if (!hasUserInput.current) return;
    setIsShown(true);
    // Kept in a ref: a part change during the glide restarts the wait instead of cancelling the hide.
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setIsShown(false), ROW_SHOW_MS);
  }, [activeIndex]);

  return isShown;
}

export default function NavLinks({ links, pageLinks = [], variant = 'pills' }: NavLinksProps) {
  const pathname = usePathname();
  const activeIndex = useActiveNavIndex(links);
  const isRowShown = useIsShownOnPartChange(activeIndex);
  // The feed and the listings belong to the showroom, so its tab stays lit there; only the look, not the swipe.
  const isInShowroom = pathname.startsWith('/explore') || pathname.startsWith('/product/');
  const litIndex = activeIndex === -1 && isInShowroom ? links.findIndex((link) => link.section === SECTION_IDS.showroom) : activeIndex;

  // On the one-page home a tab glides to its part instead of jumping there; a new-tab or middle click stays a plain link.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, link: NavLink) => {
    const isPlainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (pathname !== ONE_PAGE_PATH || !isPlainClick) return;
    event.preventDefault();
    scrollToSection(link.section);
    focusSection(link.section);
  };

  if (variant === 'row') {
    // No backdrop blur: the row shows while the page glides under it, so it would re-blur every frame.
    return (
      <nav
        inert={!isRowShown}
        className={cn(
          'absolute inset-x-0 top-full flex h-10 items-center justify-center gap-6 overflow-x-auto bg-background/25 px-4 transition-opacity duration-300 lg:hidden',
          isRowShown ? 'opacity-70' : 'pointer-events-none opacity-0'
        )}
      >
        {links.map((link, index) => {
          const isActive = index === litIndex;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={(event) => handleClick(event, link)}
              aria-current={isActive ? 'location' : undefined}
              className={cn(
                'relative shrink-0 py-2 text-xs uppercase tracking-[0.22em] transition-colors',
                'after:absolute after:inset-x-0 after:bottom-0.5 after:mx-auto after:h-px after:bg-primary after:transition-all after:duration-300',
                isActive ? 'text-primary after:w-full' : 'text-foreground/70 after:w-0 hover:text-foreground hover:after:w-full'
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  const pillClass = (isActive: boolean) =>
    cn(
      'rounded-full px-5 py-2 text-sm font-medium transition-colors duration-300',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-foreground/70 hover:bg-muted hover:text-foreground'
    );

  return (
    <nav className='hidden items-center gap-1 rounded-full border border-border bg-card/70 p-1 lg:flex'>
      {links.map((link, index) => {
        const isActive = index === litIndex;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={(event) => handleClick(event, link)}
            aria-current={isActive ? 'location' : undefined}
            className={pillClass(isActive)}
          >
            {link.label}
          </Link>
        );
      })}
      {pageLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link key={link.href} href={link.href} aria-current={isActive ? 'page' : undefined} className={pillClass(isActive)}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
