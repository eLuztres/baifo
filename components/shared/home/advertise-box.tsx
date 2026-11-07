import Link from 'next/link';
import styles from './scene-hero.module.css';

interface AdvertiseBoxProps {
  title: string;
  text: string;
  /** The shop's WhatsApp, or the contact section when it has none. */
  href: string;
}

/** The ad box at the bottom of the hero: one centered line; the whole box is the button, straight to the shop's WhatsApp. */
export default function AdvertiseBox({ title, text, href }: AdvertiseBoxProps) {
  const isExternal = /^https?:\/\//.test(href);
  return (
    <Link href={href} className={styles.advertise} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}>
      <span className={styles.advertiseWords}>
        <span className={styles.advertiseTitle}>{title}</span>
        {text && <span className={styles.advertiseText}>{text}</span>}
      </span>
    </Link>
  );
}
