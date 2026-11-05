'use client';

import type { ReactNode } from 'react';
import { CalendarDays, Megaphone } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import ChoiceDialog from '@/components/shared/choice-dialog';
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
    <ChoiceDialog title={t('CREATE_CHOOSE_TITLE')} choices={choices}>
      {children}
    </ChoiceDialog>
  );
}
