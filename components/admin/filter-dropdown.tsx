'use client';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterDropdownProps {
  label: string;
  allLabel: string;
  /** The search param the choice is kept in, as a comma-separated list. */
  param: string;
  options: FilterOption[];
  selected: string[];
}

/** A multi-select filter kept in the page's link; nothing chosen means all. */
const FilterDropdown = ({ label, allLabel, param, options, selected: selectedInLink }: FilterDropdownProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Ticks change at once, so quick taps in a row each count before the page has reloaded.
  const [selected, setSelected] = useState(selectedInLink);
  useEffect(() => setSelected(selectedInLink), [selectedInLink.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (values: string[]) => {
    setSelected(values);
    const params = new URLSearchParams(searchParams);
    if (values.length) params.set(param, values.join(','));
    else params.delete(param);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const toggle = (value: string) =>
    choose(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? options.find((option) => option.value === selected[0])?.label
        : `${options.find((option) => option.value === selected[0])?.label} +${selected.length - 1}`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          'flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-sm transition hover:border-primary/50 data-[state=open]:border-primary',
          selected.length ? 'border-primary/60 bg-primary/10' : 'border-border bg-card'
        )}
      >
        <span className='text-muted-foreground'>{label}</span>
        <span className='truncate font-medium'>{summary}</span>
        <ChevronDown className='size-4 shrink-0 text-muted-foreground' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='min-w-56 rounded-2xl p-1.5'>
        {/* Several choices stay open: the menu closes on a tap outside. */}
        <DropdownMenuCheckboxItem checked={selected.length === 0} onSelect={(event) => { event.preventDefault(); choose([]); }} className='rounded-xl'>
          {allLabel}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onSelect={(event) => {
              event.preventDefault();
              toggle(option.value);
            }}
            className='rounded-xl'
          >
            <span className='flex-1'>{option.label}</span>
            {option.count !== undefined && <span className='ml-4 text-xs tabular-nums opacity-60'>{option.count}</span>}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FilterDropdown;
