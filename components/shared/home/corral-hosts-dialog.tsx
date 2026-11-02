'use client';

import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import WhatsAppLogo from '@/components/shared/whatsapp-logo';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { CorralHost } from './corral-hosts';
import styles from './scene-hero.module.css';

interface CorralHostsDialogProps {
  hosts: CorralHost[];
  text: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** The corral hosts coming out one after the other, each with a WhatsApp button, so you write to a person. */
export default function CorralHostsDialog({ hosts, text, isOpen, onOpenChange }: CorralHostsDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-lg'>
        <DialogTitle className='text-center font-display text-2xl'>{t('HOME_HERO_HOSTS_TITLE')}</DialogTitle>
        <DialogDescription className='text-center'>{text}</DialogDescription>
        <ul className='mt-2 grid gap-3 sm:grid-cols-2'>
          {hosts.map((host, index) => (
            <li key={host.corralName} className={styles.host} style={{ animationDelay: `${120 + index * 110}ms` }}>
              <span className='relative block size-20 shrink-0 overflow-hidden rounded-full ring-4 ring-background shadow-lg'>
                <ProductMedia src={host.image} alt={host.name} fill sizes='(min-width: 640px) 7rem, 5rem' className='object-cover object-top' />
              </span>
              <span className={styles.hostWords}>
                <span className='block font-display text-lg font-semibold leading-tight'>{host.name}</span>
                <span className='block text-sm text-muted-foreground'>{host.corralName}</span>
              </span>
              <a href={host.whatsappUrl} target='_blank' rel='noopener noreferrer' className={styles.hostWhatsapp}>
                <WhatsAppLogo />
                {t('HOME_HERO_HOST_WHATSAPP', { name: host.name })}
              </a>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
