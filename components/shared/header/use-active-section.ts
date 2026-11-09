'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { PARTS_PATH, SECTION_IDS, SECTION_ORDER, type SectionId } from '@/components/shared/home/one-page';
import type { NavLink } from './nav-items';

// The top half of the screen: the current part is the last one reaching into it, i.e. whose top has passed the middle.
const TOP_HALF_MARGIN = '0px 0px -50% 0px';

// One observer shared by every nav (desktop tabs, phone row, swipe) instead of one scroll listener each.
let activeSection: SectionId = SECTION_ORDER[0];
let stopWatching: (() => void) | undefined;
const listeners = new Set<() => void>();

function watchSections() {
  const reachingTopHalf = new Set<Element>();
  const intersections = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) reachingTopHalf.add(target);
      else reachingTopHalf.delete(target);
    });
    const current = SECTION_ORDER.findLast((id) => {
      const section = document.getElementById(id);
      return section !== null && reachingTopHalf.has(section);
    });
    // Over a footer taller than half the screen no part reaches in, and the last one stays current.
    if (!current || current === activeSection) return;
    activeSection = current;
    listeners.forEach((listener) => listener());
  }, { rootMargin: TOP_HALF_MARGIN });

  // The parts stream in after the header, and a new render of the page replaces them, so they're looked up on every change.
  const observed = new Set<Element>();
  const observeSections = () => {
    observed.forEach((section) => {
      if (section.isConnected) return;
      intersections.unobserve(section);
      observed.delete(section);
      reachingTopHalf.delete(section);
    });
    SECTION_ORDER.forEach((id) => {
      const section = document.getElementById(id);
      if (!section || observed.has(section)) return;
      observed.add(section);
      intersections.observe(section);
    });
  };
  const mutations = new MutationObserver(observeSections);
  mutations.observe(document.querySelector('main') ?? document.body, { childList: true, subtree: true });
  observeSections();

  return () => {
    mutations.disconnect();
    intersections.disconnect();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  stopWatching ??= watchSections();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    stopWatching?.();
    stopWatching = undefined;
    activeSection = SECTION_ORDER[0];
  };
}

const subscribeNowhere = () => () => {};
const getActiveSection = () => activeSection;
const getFirstSection = () => SECTION_ORDER[0];

/** The part on screen; only for the page holding the parts. */
export const useActiveSection = (): SectionId => useSyncExternalStore(subscribe, getActiveSection, getFirstSection);

/** The index of the nav link whose part is on screen, or -1 on any other page (or before a part is seen). */
export function useActiveNavIndex(links: NavLink[]): number {
  const isPartsPage = usePathname() === PARTS_PATH;
  const section = useSyncExternalStore(isPartsPage ? subscribe : subscribeNowhere, getActiveSection, getFirstSection);
  return isPartsPage && section !== SECTION_IDS.home ? links.findIndex((link) => link.section === section) : -1;
}
