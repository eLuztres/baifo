import styles from './dunes-background.module.css';

// One dune ridge, twice as wide as the screen so it can drift sideways without an edge showing.
const DUNE_PATHS = [
  'M0 120 C 240 40 480 40 720 110 S 1200 170 1440 100 S 1920 40 2160 110 S 2640 170 2880 100 V 220 H 0 Z',
  'M0 140 C 300 80 520 90 760 140 S 1260 190 1440 140 S 1960 80 2200 140 S 2700 190 2880 140 V 220 H 0 Z',
  'M0 170 C 260 130 560 130 820 165 S 1300 200 1440 175 S 2000 130 2260 165 S 2740 200 2880 175 V 220 H 0 Z',
];

/** A desert decoration: soft sand dunes drift at the bottom of the page under a warm, low sun. */
export default function DunesBackground() {
  return (
    <div className={styles.field} aria-hidden='true'>
      <div className={styles.sun} />
      {DUNE_PATHS.map((path, index) => (
        <svg key={path} className={styles.dune} data-layer={index} viewBox='0 0 2880 220' preserveAspectRatio='none'>
          <path d={path} fill='currentColor' />
        </svg>
      ))}
    </div>
  );
}
