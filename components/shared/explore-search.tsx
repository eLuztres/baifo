'use client';

import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Search, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import { matchRange, queryWords, searchScore, type SearchableText } from '@/lib/search-text';
import { cn } from '@/lib/utils';

/** A listing as the field suggests it. */
export interface SearchListing {
  href: string;
  name: string;
  image: string;
  /** Its category, in small letters under the name. */
  category?: string;
  text: SearchableText;
}

/** A category or a kind of listing (wanted, services, events), which opens the feed narrowed to it. */
export interface SearchChoice {
  href: string;
  label: string;
  image?: string;
  count: number;
  text: SearchableText;
}

interface ExploreSearchProps {
  listings: SearchListing[];
  choices: SearchChoice[];
  /** What the feed shows now: the query typed, or the chosen category's name. */
  value: string;
  /** Whether the feed is narrowed, so clearing the field opens everything again. */
  isFiltered: boolean;
}

interface Option {
  id: string;
  href: string;
  label: string;
  image?: string;
  /** A listing's category, under its name. */
  category?: string;
  /** How many listings a category or kind has. */
  count?: number;
  isAll?: boolean;
}

const MAX_CHOICES = 4;
const MAX_LISTINGS = 6;

const best = <T extends { text: SearchableText }>(items: T[], words: string[], max: number) =>
  items
    .map((item) => ({ item, score: searchScore(item.text, words) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ item }) => item);

/** The first typed word in bold where it shows in the name. */
function Highlighted({ text, words }: { text: string; words: string[] }) {
  const range = matchRange(text, words);
  if (!range) return <>{text}</>;
  return (
    <>
      {text.slice(0, range.start)}
      <span className='font-semibold text-primary'>{text.slice(range.start, range.end)}</span>
      {text.slice(range.end)}
    </>
  );
}

/** The feed's search: suggests categories and listings while typing (by name, category or description); Enter shows every match. */
export default function ExploreSearch({ listings, choices, value, isFiltered }: ExploreSearchProps) {
  const { t } = useI18n();
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const words = useMemo(() => queryWords(query), [query]);

  // Empty: the categories, as a way in. Typed: every match first, then the best categories and listings.
  const options = useMemo<Option[]>(() => {
    if (words.length === 0) return choices.map((choice) => ({ id: choice.href, href: choice.href, label: choice.label, image: choice.image, count: choice.count }));
    const searchHref = `/explore?${new URLSearchParams({ q: query.trim() })}`;
    return [
      { id: searchHref, href: searchHref, label: t('EXPLORE_SEARCH_ALL', { query: query.trim() }), isAll: true },
      ...best(choices, words, MAX_CHOICES).map((choice) => ({ id: choice.href, href: choice.href, label: choice.label, image: choice.image, count: choice.count })),
      ...best(listings, words, MAX_LISTINGS).map((listing) => ({ id: listing.href, href: listing.href, label: listing.name, image: listing.image, category: listing.category })),
    ];
  }, [choices, listings, query, t, words]);

  const go = (href: string) => {
    setIsOpen(false);
    inputRef.current?.blur();
    router.push(href);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const option = options[activeIndex];
    if (isOpen && option) return go(option.href);
    if (words.length > 0) go(`/explore?${new URLSearchParams({ q: query.trim() })}`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      // -1 is the field itself, between the last option and the first.
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => ((current + 1 + step + options.length + 1) % (options.length + 1)) - 1);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const clear = () => {
    setQuery('');
    setActiveIndex(-1);
    if (isFiltered) go('/explore');
    else inputRef.current?.focus();
  };

  const showsList = isOpen && options.length > 0;
  const activeOption = showsList ? options[activeIndex] : undefined;

  return (
    <form role='search' onSubmit={submit} className='relative mx-auto w-full max-w-2xl'>
      <label htmlFor={`${listboxId}-input`} className='sr-only'>
        {t('EXPLORE_SEARCH_LABEL')}
      </label>
      <Search className='pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground' aria-hidden />
      <input
        ref={inputRef}
        id={`${listboxId}-input`}
        type='search'
        role='combobox'
        aria-expanded={showsList}
        aria-controls={listboxId}
        aria-autocomplete='list'
        aria-activedescendant={activeOption ? `${listboxId}-${activeIndex}` : undefined}
        autoComplete='off'
        enterKeyHint='search'
        value={query}
        placeholder={t('EXPLORE_SEARCH_PLACEHOLDER')}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(-1);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        className='h-12 w-full rounded-full border border-border bg-card pl-12 pr-12 text-base shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 sm:h-14 [&::-webkit-search-cancel-button]:hidden'
      />
      {query && (
        <button
          type='button'
          onClick={clear}
          aria-label={t('EXPLORE_SEARCH_CLEAR')}
          className='absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground sm:size-10'
        >
          <X className='size-5' aria-hidden />
        </button>
      )}
      {showsList && (
        <ul
          id={listboxId}
          role='listbox'
          aria-label={t('EXPLORE_SEARCH_LABEL')}
          className='absolute inset-x-0 top-full z-30 mt-2 max-h-[min(28rem,60svh)] overflow-y-auto rounded-3xl border border-border bg-card p-1.5 shadow-xl'
        >
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`${listboxId}-${index}`}
              role='option'
              aria-selected={index === activeIndex}
              // Before the input's blur, which would close the list first.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => go(option.href)}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 text-sm',
                index === activeIndex && 'bg-muted',
                option.isAll && 'font-medium text-primary'
              )}
            >
              <span className='relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted'>
                {option.isAll ? (
                  <Search className='size-4' aria-hidden />
                ) : option.image ? (
                  <ProductMedia src={option.image} alt='' fill sizes='40px' isStill />
                ) : (
                  <LayoutGrid className='size-4 text-muted-foreground' aria-hidden />
                )}
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block truncate'>{option.isAll ? option.label : <Highlighted text={option.label} words={words} />}</span>
                {option.category && <span className='block truncate text-xs text-muted-foreground'>{option.category}</span>}
              </span>
              {option.count !== undefined && <span className='shrink-0 text-xs text-muted-foreground'>{option.count}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
