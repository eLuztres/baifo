'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** Waits this long after the last key, so the feed doesn't reload on every letter. */
const TYPING_PAUSE_MS = 350;

interface ExploreSearchProps {
  placeholder: string;
  label: string;
  clearLabel: string;
  maxLength: number;
}

/** The feed's search: filters as the visitor types and keeps the chosen chips; the cross brings the whole feed back. */
const ExploreSearch = ({ placeholder, label, clearLabel, maxLength }: ExploreSearchProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const [value, setValue] = useState(urlQuery);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);

  // A chip like "Todo" can clear the search from outside; the field follows the address, but not while
  // typing, when a late address would undo the letters typed since.
  useEffect(() => {
    if (document.activeElement !== input.current) setValue(urlQuery);
  }, [urlQuery]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (text: string) => {
    clearTimeout(timer.current);
    // The address as it is now: a chip tapped during the typing pause must not be undone by the old one.
    const params = new URLSearchParams(window.location.search);
    if (text.trim()) params.set('q', text.trim());
    else params.delete('q');
    // `hoy` is a bare flag; URLSearchParams would write it as "hoy=". No `params.size`: iOS 16 Safari lacks it.
    const queryString = params.toString().replace(/(^|&)hoy=(?=&|$)/, '$1hoy');
    const href = queryString ? `${pathname}?${queryString}` : pathname;
    startTransition(() => router.replace(href, { scroll: false }));
  };

  const onChange = (text: string) => {
    setValue(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(text), TYPING_PAUSE_MS);
  };

  return (
    <form
      action={pathname}
      role='search'
      className='relative'
      onSubmit={(event) => {
        event.preventDefault();
        search(value);
        // Closes the phone's keyboard, so the results are visible.
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      {isPending ? (
        <Loader2 className='pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground' aria-hidden />
      ) : (
        <Search className='pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground' aria-hidden />
      )}
      <Input
        ref={input}
        type='search'
        name='q'
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={label}
        enterKeyHint='search'
        autoComplete='off'
        className='h-12 rounded-full border-border bg-card pl-12 pr-12 text-base shadow-sm [&::-webkit-search-cancel-button]:hidden'
      />
      {value && (
        <button
          type='button'
          onClick={() => {
            setValue('');
            search('');
          }}
          aria-label={clearLabel}
          className='absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <X className='size-5' aria-hidden />
        </button>
      )}
    </form>
  );
};

export default ExploreSearch;
