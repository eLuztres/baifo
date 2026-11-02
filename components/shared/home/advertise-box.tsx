'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import WhatsAppLogo from '@/components/shared/whatsapp-logo';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import styles from './scene-hero.module.css';

export interface CorralHost {
  name: string;
  corralName: string;
  image: string;
  whatsappUrl: string;
}

interface AdvertiseBoxProps {
  title: string;
  text: string;
  buttonLabel: string;
  hosts: CorralHost[];
  /** Where the box goes when no corral has a host yet. */
  fallbackHref: string;
}

/** The ad box at the bottom of the hero: the whole box is the button, and it opens the corral hosts to write to. */
export default function AdvertiseBox({ title, text, buttonLabel, hosts, fallbackHref }: AdvertiseBoxProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const content = (
    <>
      <span className={styles.advertiseWords}>
        <span className={styles.advertiseTitle}>{title}</span>
        {text && <span className={styles.advertiseText}>{text}</span>}
      </span>
      <span className={styles.advertiseButton}>
        <WhatsAppLogo />
        {buttonLabel}
      </span>
    </>
  );

  if (hosts.length === 0) {
    return (
      <Link href={fallbackHref} className={styles.advertise}>
        {content}
      </Link>
    );
  }

  return (
    <>
      <button type='button' className={styles.advertise} onClick={() => setIsOpen(true)}>
        {content}
      </button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-lg'>
          <DialogTitle className='text-center font-display text-2xl'>{t('HOME_HERO_HOSTS_TITLE')}</DialogTitle>
          <DialogDescription className='text-center'>{t('HOME_HERO_HOSTS_TEXT')}</DialogDescription>
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
    </>
  );
}
