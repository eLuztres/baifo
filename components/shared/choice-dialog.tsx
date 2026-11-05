'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export interface Choice {
  href: string;
  icon?: LucideIcon;
  title: string;
  hint?: string;
}

interface ChoiceDialogProps {
  title: string;
  choices: Choice[];
  /** The button that opens the choice. */
  children: ReactNode;
}

/** A button that first asks where to go: one big card per choice, as "Crear" does. */
export default function ChoiceDialog({ title, choices, children }: ChoiceDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='w-[calc(100%-2rem)] max-w-sm rounded-3xl'>
        <DialogHeader>
          <DialogTitle className='text-center font-display text-2xl'>{title}</DialogTitle>
        </DialogHeader>
        <div className='grid gap-3'>
          {choices.map(({ href, icon: Icon, title: choiceTitle, hint }) => (
            <DialogClose key={href} asChild>
              <Link
                href={href}
                className='flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                <span className='flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                  {Icon && <Icon className='size-6' aria-hidden />}
                </span>
                <span className='min-w-0'>
                  <span className='block font-display text-xl'>{choiceTitle}</span>
                  {hint && <span className='block text-sm text-muted-foreground'>{hint}</span>}
                </span>
              </Link>
            </DialogClose>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
