import LoaderImage from '@/components/shared/LoaderImage';
import { BRAND } from '@/lib/brand';
import styles from '@/components/shared/page-transition.module.css';

// Inside the shop layout, so header, menu and background stay put while a page loads.
export default function Loading() {
  return (
    <div className={styles.loader}>
      <LoaderImage image={BRAND.loaderImage} />
    </div>
  );
}
