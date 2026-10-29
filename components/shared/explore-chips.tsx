import Link from 'next/link';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExploreChip {
  key: string;
  label: string;
  /** Where tapping goes: for a chosen chip, the feed without it. */
  href: string;
  isActive: boolean;
}

interface ExploreChipsProps {
  /** The row's name for screen readers. */
  label: string;
  /** "Todo" first; the rest in their order. */
  chips: ExploreChip[];
}

/** The feed's filters as one swipeable row of chips; chosen ones come right after "Todo", so they're always in sight. */
const ExploreChips = ({ label, chips }: ExploreChipsProps) => {
  const [all, ...rest] = chips;
  const ordered = [all, ...rest.filter((chip) => chip.isActive), ...rest.filter((chip) => !chip.isActive)];
  const activeKeys = ordered.filter((chip) => chip.isActive).map((chip) => chip.key);
  return (
    <nav aria-label={label} className='-mx-4'>
      {/* A new key per choice starts the row at the left again; otherwise it stays swiped and hides "Todo" and the chosen chip. */}
      <div key={activeKeys.join()} className='overflow-x-auto px-4'>
        <ul className='flex w-max gap-2'>
          {ordered.map((chip) => (
            <li key={chip.key}>
              <Link
                href={chip.href}
                aria-current={chip.isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors',
                  chip.isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-primary/40'
                )}
              >
                {chip.label}
                {chip.isActive && chip !== all && <X className='-mr-1 size-3.5' aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default ExploreChips;
