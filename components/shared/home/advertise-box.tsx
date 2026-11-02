'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/components/i18n-provider';
import type { CorralHost } from './corral-hosts';
import CorralHostsDialog from './corral-hosts-dialog';
import styles from './scene-hero.module.css';

interface AdvertiseBoxProps {
  title: string;
  text: string;
  hosts: CorralHost[];
  /** Where the box goes when no corral has a host yet. */
  fallbackHref: string;
}

/** The ad box at the bottom of the hero: one centered line; the whole box is the button, and it opens the corral hosts to write to. */
export default function AdvertiseBox({ title, text, hosts, fallbackHref }: AdvertiseBoxProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const content = (
    <>
      <span className={styles.advertiseWords}>
        <span className={styles.advertiseTitle}>{title}</span>
        {text && <span className={styles.advertiseText}>{text}</span>}
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
      <CorralHostsDialog hosts={hosts} text={t('HOME_HERO_HOSTS_TEXT')} isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
