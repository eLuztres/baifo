import styles from '@/components/shared/page-transition.module.css';

// A template remounts on every navigation, so each page plays the soft entrance.
export default function PageTransition({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={styles.page}>{children}</div>;
}
