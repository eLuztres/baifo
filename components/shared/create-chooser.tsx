'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, Megaphone } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { newListingPath } from '@/lib/constants';

interface CreateChooserProps {
  /** The button that opens the choice, e.g. "Crear" in the admin menu or the shop's floating "+". */
  children: ReactNode;
}

/** "Crear" asks first what it is: an Anuncio or an Evento, each with its own editor. */
export default function CreateChooser({ children }: CreateChooserProps) {
  const { t } = useI18n();
  const choices = [
    { href: newListingPath('PRODUCT'), icon: Megaphone, title: t('CREATE_AD'), hint: t('CREATE_AD_HINT') },
    { href: newListingPath('EVENT'), icon: CalendarDays, title: t('CREATE_EVENT'), hint: t('CREATE_EVENT_HINT') },
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='w-[calc(100%-2rem)] max-w-sm rounded-3xl'>
        <DialogHeader>
          <DialogTitle className='text-center font-display text-2xl'>{t('CREATE_CHOOSE_TITLE')}</DialogTitle>
        </DialogHeader>
        <div className='grid gap-3'>
          {choices.map(({ href, icon: Icon, title, hint }) => (
            <DialogClose key={href} asChild>
              <Link
                href={href}
                className='flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                <span className='flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                  <Icon className='size-6' aria-hidden />
                </span>
                <span className='min-w-0'>
                  <span className='block font-display text-xl'>{title}</span>
                  <span className='block text-sm text-muted-foreground'>{hint}</span>
                </span>
              </Link>
            </DialogClose>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
