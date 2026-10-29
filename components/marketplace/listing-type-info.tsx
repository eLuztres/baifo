'use client';

import { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ListingTypeInfoProps {
  /** The listing type's name, on the tab and as the popup's title. */
  label: string;
  /** What the type is and what the AI does with it. */
  text: string;
  /** The info button's name for screen readers, e.g. "More information". */
  infoLabel: string;
  /** The type's icon, shown before the name like on the other tabs. */
  icon: ReactNode;
  /** As a radio among buttons that switch the type in place. */
  role?: string;
  'aria-checked'?: boolean;
}

/** The chosen listing type's tab: its name with an info button that explains the type in a popup. */
const ListingTypeInfo = ({ label, text, infoLabel, icon, ...triggerProps }: ListingTypeInfoProps) => (
  <Dialog>
    <DialogTrigger
      {...triggerProps}
      aria-label={`${label}: ${infoLabel}`}
      className='flex items-center justify-center gap-1 whitespace-nowrap sm:gap-2 rounded-full bg-background px-2 py-2 text-xs font-medium text-foreground shadow-sm min-[400px]:px-3 min-[400px]:text-sm sm:px-4'
    >
      {icon} {label} <Info className='size-3.5 text-primary min-[400px]:size-4' aria-hidden />
    </DialogTrigger>
    <DialogContent className='w-[calc(100%-2rem)] max-w-md rounded-3xl border-primary/30 bg-card'>
      <DialogHeader className='space-y-2 text-left'>
        <DialogTitle className='text-2xl'>{label}</DialogTitle>
        <DialogDescription className='leading-6'>{text}</DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default ListingTypeInfo;
