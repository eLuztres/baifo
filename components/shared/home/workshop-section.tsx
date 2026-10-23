import PageHeader from '@/components/shared/page-header';
import type { TranslationKey } from '@/lib/i18n';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';
import { SECTION_IDS } from './one-page';
import styles from './one-page.module.css';
import WorkshopGallery from './workshop-gallery';
import WorkshopSteps from './workshop-steps';

interface WorkshopStep {
  title: TranslationKey;
  text: TranslationKey;
  image: string;
}

const STEPS: WorkshopStep[] = [
  { title: 'WORKSHOP_STEP_1_TITLE', text: 'WORKSHOP_STEP_1_TEXT', image: '/brand/taller/materia.jpg' },
  { title: 'WORKSHOP_STEP_2_TITLE', text: 'WORKSHOP_STEP_2_TEXT', image: '/brand/taller/torno.jpg' },
  { title: 'WORKSHOP_STEP_3_TITLE', text: 'WORKSHOP_STEP_3_TEXT', image: '/brand/taller/acabado.jpg' },
];

const GALLERY = [
  'encargo',
  'torno-anillo',
  'laton',
  'cobre',
  'anillos',
  'tornear',
  'cajas',
  'noche',
].map((name) => `/brand/taller/${name}.jpg`);

// Sideways only: a vertical overflow would make the one-page scroller treat the row as its own scroller.
const SWIPE_ROW_CLASS = 'flex snap-x gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] sm:gap-4';

export default async function WorkshopSection() {
  const { t } = await getT();

  return (
    <section id={SECTION_IDS.workshop} className={cn('gap-4 sm:gap-6', styles.section, styles.fitScreen)}>
      <PageHeader
        as='h2'
        className='shrink-0'
        eyebrow={t('WORKSHOP_EYEBROW')}
        title={t('WORKSHOP_TITLE')}
        description={t('WORKSHOP_INTRO')}
      />

      {/* Phones swipe through the steps sideways, so the workshop stays one screen tall. */}
      <WorkshopSteps
        steps={STEPS.map((step) => ({ image: step.image, title: t(step.title), text: t(step.text) }))}
        className={cn(SWIPE_ROW_CLASS, styles.fill, 'md:grid md:grid-cols-3 md:overflow-visible')}
      />

      <div className='shrink-0 space-y-2'>
        <h3 className='eyebrow'>{t('WORKSHOP_GALLERY_TITLE')}</h3>
        <WorkshopGallery
          images={GALLERY}
          alt={t('WORKSHOP_GALLERY_TITLE')}
          className={cn(SWIPE_ROW_CLASS, 'h-[clamp(4.5rem,11svh,9rem)]')}
        />
      </div>
    </section>
  );
}
