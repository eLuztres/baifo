import { GoldSparkles } from './genie-lamp';
import styles from './gold-leaf-background.module.css';

export default function GoldLeafBackground() {
  return (
    <div className={styles.field} aria-hidden='true'>
      <div className={styles.heart} />
      <GoldSparkles />
    </div>
  );
}
