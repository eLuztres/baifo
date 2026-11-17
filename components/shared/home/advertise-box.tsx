import Link from 'next/link';
import WhoSentYouLink, { type ScoutChoice } from '@/components/shared/who-sent-you';
import styles from './scene-hero.module.css';

interface AdvertiseBoxProps {
  title: string;
  text: string;
  /** The shop's WhatsApp, or the contact section when it has none. */
  href: string;
  /** Asked first when the box opens WhatsApp. */
  scouts: ScoutChoice[];
  shopName: string;
}

/** The ad box at the bottom of the hero: one centered line; the whole box is the button to the shop's WhatsApp. */
export default function AdvertiseBox({ title, text, href, scouts, shopName }: AdvertiseBoxProps) {
  const words = (
    <span className={styles.advertiseWords}>
      <span className={styles.advertiseTitle}>{title}</span>
      {text && <span className={styles.advertiseText}>{text}</span>}
    </span>
  );
  return /^https?:\/\//.test(href) ? (
    <WhoSentYouLink href={href} scouts={scouts} shopName={shopName} className={styles.advertise}>
      {words}
    </WhoSentYouLink>
  ) : (
    <Link href={href} className={styles.advertise}>
      {words}
    </Link>
  );
}
