import { Smartphone } from 'lucide-react';
import { getT } from '@/lib/i18n-server';
import styles from './turn-upright.module.css';
import TurnUprightWatch from './turn-upright-watch';

/** Covers the shop on phones held sideways and asks to turn them upright (shown by CSS, see the module). */
export default async function TurnUpright() {
  const { t } = await getT();

  return (
    <div className={styles.overlay}>
      <TurnUprightWatch />
      <Smartphone className={styles.icon} aria-hidden='true' />
      <p className={styles.text}>{t('TURN_UPRIGHT')}</p>
    </div>
  );
}
