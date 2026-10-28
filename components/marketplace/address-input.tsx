'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { findAddresses } from '@/lib/marketplace/admin.actions';
import { matchAddresses } from '@/lib/marketplace/match-addresses';
import { cn } from '@/lib/utils';

const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 6;

interface AddressInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** The listing's place: the addresses around its town are suggested. */
  placeId: string;
  placeholder?: string;
  className?: string;
}

/** An address field that suggests places while typing; picking one fills it in. Anything typed stays valid too. */
export default function AddressInput({ id, value, onChange, placeId, placeholder, className }: AddressInputProps) {
  // Loaded once per place, so typing filters on the device without waiting for the server.
  const [addresses, setAddresses] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const listId = `${id}-suggestions`;

  useEffect(() => {
    let isCurrent = true;
    findAddresses(placeId)
      .then((result) => isCurrent && setAddresses(result.addresses))
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [placeId]);

  const suggestions = useMemo(
    () => (isOpen && value.trim().length >= MIN_QUERY_LENGTH ? matchAddresses(addresses, value, MAX_SUGGESTIONS) : []),
    [addresses, value, isOpen]
  );

  const pick = (address: string) => {
    onChange(address);
    setIsOpen(false);
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
          setActiveIndex(-1);
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
        className={className}
      />
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
