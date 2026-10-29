'use client';

import Link from 'next/link';
import { CalendarDays, HandHelping, Package, Search } from 'lucide-react';
import { LISTING_TYPES, newListingPath, type ListingType } from '@/lib/constants';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';
import ListingTypeInfo from './listing-type-info';

interface ListingTypeTabsProps {
  type: ListingType;
  texts: AdminTexts;
  /** Before the listing exists: each tab links to the new listing page for its type. */
  hasLinks?: boolean;
  /** Once the listing exists: the tabs switch its type in place. */
  onSelect?: (type: ListingType) => void;
  /** While a new listing is made, the chosen tab explains its type in a popup. */
  hasInfo?: boolean;
  isDisabled?: boolean;
}

const TYPE_ICONS = { PRODUCT: Package, WANTED: Search, SERVICE: HandHelping, EVENT: CalendarDays } as const;

const TAB_CLASS =
  'flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-2 py-2 text-xs font-medium transition-colors min-[400px]:px-3 min-[400px]:text-sm sm:px-4';

/** Producto · Busco · Servicio · Evento, the same row on every step of a new listing and in the editor. */
export default function ListingTypeTabs({ type, texts, hasLinks = false, onSelect, hasInfo = false, isDisabled = false }: ListingTypeTabsProps) {
  const intro = { PRODUCT: '', SERVICE: texts.newServiceIntro, WANTED: texts.newWantedIntro, EVENT: texts.newEventIntro }[type];
  // One row in every language down to 320px: small words and tight padding on phones, no icons.
  const tabs = LISTING_TYPES.map((option) => {
    const Icon = TYPE_ICONS[option];
    const label = texts[`type_${option}`];
    const isChosen = option === type;
    const icon = <Icon className='hidden size-4 shrink-0 sm:block' aria-hidden />;
    const className = cn(TAB_CLASS, isChosen ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground');
    // The chosen type's tab explains it in a popup instead of a paragraph under the tabs.
    if (isChosen && hasInfo && intro) {
      const radio = onSelect ? { role: 'radio', 'aria-checked': true } : {};
      return <ListingTypeInfo key={option} label={label} text={intro} infoLabel={texts.typeInfo} icon={icon} {...radio} />;
    }
    if (hasLinks) {
      return (
        <Link key={option} href={newListingPath(option)} aria-current={isChosen ? 'page' : undefined} className={className}>
          {icon} {label}
        </Link>
      );
    }
    return (
      <button
        key={option}
        type='button'
        role='radio'
        aria-checked={isChosen}
        disabled={isDisabled}
        onClick={() => !isChosen && onSelect?.(option)}
        className={cn(className, 'disabled:opacity-60')}
      >
        {icon} {label}
      </button>
    );
  });

  return (
    <div className='mx-auto max-w-xl text-center'>
      {hasLinks ? (
        <nav aria-label={texts.typeLabel} className='inline-flex max-w-full rounded-full bg-muted p-1'>
          {tabs}
        </nav>
      ) : (
        <div role='radiogroup' aria-label={texts.typeLabel} className='inline-flex max-w-full rounded-full bg-muted p-1'>
          {tabs}
        </div>
      )}
    </div>
  );
}
