'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { findAddresses } from '@/lib/marketplace/admin.actions';
import { cn } from '@/lib/utils';

// Waits for a short pause in typing, so the map search isn't asked on every key.
const SEARCH_DELAY_MS = 300;
const MIN_QUERY_LENGTH = 3;

interface AddressInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** An address field that suggests places while typing; picking one fills it in. Anything typed stays valid too. */
export default function AddressInput({ id, value, onChange, placeholder, className }: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // Only the latest search may show its answer; an earlier one can arrive after it.
  const searchCount = useRef(0);
  const listId = `${id}-suggestions`;

  useEffect(() => {
    if (!isOpen || value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }
    const count = ++searchCount.current;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { addresses } = await findAddresses(value).catch(() => ({ addresses: [] as string[] }));
      if (count !== searchCount.current) return;
      setIsSearching(false);
      setSuggestions(addresses);
      setActiveIndex(-1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value, isOpen]);

  const pick = (address: string) => {
    onChange(address);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + step + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isListShown = isOpen && suggestions.length > 0;

  return (
    <div className='relative'>
      <Input
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setIsOpen(false)}
        placeholder={placeholder}
        maxLength={200}
        autoComplete='off'
        role='combobox'
        aria-expanded={isListShown}
        aria-controls={listId}
        aria-autocomplete='list'
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        className={cn('pr-10', className)}
      />
      {isSearching && isOpen && (
        <Loader2 className='absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground' aria-hidden='true' />
      )}
      {isListShown && (
        <ul id={listId} role='listbox' className='absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-border bg-card py-1 shadow-lg'>
          {suggestions.map((address, index) => (
            <li
              key={address}
              id={`${listId}-${index}`}
              role='option'
              aria-selected={index === activeIndex}
              // Picks before the field's blur closes the list.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(address);
              }}
              className={cn('flex cursor-pointer items-start gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted', index === activeIndex && 'bg-muted')}
            >
              <MapPin className='mt-0.5 size-4 shrink-0 text-primary' aria-hidden='true' />
              <span>{address}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
