import Link from 'next/link';
import { Tag } from 'lucide-react';
import type { Locale } from '@/lib/i18n-core';
import { byTagName, tagHref, tagNameIn, type TagNames } from '@/lib/tag-names';
import { cn } from '@/lib/utils';

interface TagBadgesProps {
  tags: { id: string; names: TagNames }[];
  locale: Locale;
  /** Each badge opens every listing with that etiqueta; not inside a card, which is a link itself. */
  isLinked?: boolean;
  className?: string;
}

/** A listing's etiquetas as small badges, A to Z in the visitor's language. */
export default function TagBadges({ tags, locale, isLinked, className }: TagBadgesProps) {
  if (tags.length === 0) return null;
  const badgeClass = 'inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs';
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {[...tags].sort(byTagName(locale)).map((tag) => {
        const content = (
          <>
            <Tag className='size-3 shrink-0 text-primary' aria-hidden />
            <span className='truncate'>{tagNameIn(tag.names, locale)}</span>
          </>
        );
        return (
          <li key={tag.id} className='min-w-0'>
            {isLinked ? (
              <Link href={tagHref(tag.names, locale)} className={cn(badgeClass, 'transition hover:border-primary/50')}>
                {content}
              </Link>
            ) : (
              <span className={badgeClass}>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
