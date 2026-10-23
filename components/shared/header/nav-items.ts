import { hasContactInfo, hasWorkshop } from '@/lib/brand';
import type { Translator } from '@/lib/i18n-core';
import { SECTION_IDS, sectionHref, type SectionId } from '@/components/shared/home/one-page';

export interface NavLink {
  href: string;
  label: string;
  section: SectionId;
}

const navLink = (section: SectionId, label: string): NavLink => ({ href: sectionHref(section), label, section });

// Not in the 'use client' nav-links module, so server components (header, menu, footer) can call it.
export const getNavLinks = (t: Translator): NavLink[] => [
  navLink(SECTION_IDS.home, t('NAV_HOME')),
  navLink(SECTION_IDS.showroom, t('NAV_SHOWROOM')),
  ...(hasWorkshop ? [navLink(SECTION_IDS.workshop, t('NAV_WORKSHOP'))] : []),
  ...(hasContactInfo ? [navLink(SECTION_IDS.contact, t('NAV_CONTACT'))] : []),
];
