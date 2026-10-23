import PageHeader from '@/components/shared/page-header';
import type { TranslationKey } from '@/lib/i18n';
import { APP_NAME } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { WORKSHOP, hasWorkshop } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { SECTION_IDS } from './one-page';
import styles from './one-page.module.css';
import WorkshopGallery from './workshop-gallery';
import WorkshopSteps from './workshop-steps';

const STEP_TEXTS: { title: TranslationKey; text: TranslationKey }[] = [
  { title: 'WORKSHOP_STEP_1_TITLE', text: 'WORKSHOP_STEP_1_TEXT' },
  { title: 'WORKSHOP_STEP_2_TITLE', text: 'WORKSHOP_STEP_2_TEXT' },
  { title: 'WORKSHOP_STEP_3_TITLE', text: 'WORKSHOP_STEP_3_TEXT' },
];

// Sideways only: a vertical overflow would make the one-page scroller treat the row as its own scroller.
const SWIPE_ROW_CLASS = 'flex snap-x gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] sm:gap-4';

export default async function WorkshopSection() {
  if (!hasWorkshop) return null;
  const { t } = await getT();
  const steps = WORKSHOP.steps.slice(0, STEP_TEXTS.length).map((image, index) => ({
    image,
    title: t(STEP_TEXTS[index].title),
    text: t(STEP_TEXTS[index].text),
  }));

  return (
    <section id={SECTION_IDS.workshop} className={cn('gap-4 sm:gap-6', styles.section, styles.fitScreen)}>
      <PageHeader
        as='h2'
        className='shrink-0'
        eyebrow={t('WORKSHOP_EYEBROW')}
        title={t('WORKSHOP_TITLE')}
        description={t('WORKSHOP_INTRO', { shop: APP_NAME })}
      />

      {/* Phones swipe through the steps sideways, so the workshop stays one screen tall. */}
      <WorkshopSteps
        steps={steps}
        className={cn(SWIPE_ROW_CLASS, styles.fill, 'md:grid md:grid-cols-3 md:overflow-visible')}
      />

      {WORKSHOP.gallery.length > 0 && (
        <div className='shrink-0 space-y-2'>
          <h3 className='eyebrow'>{t('WORKSHOP_GALLERY_TITLE')}</h3>
          <WorkshopGallery
            images={WORKSHOP.gallery}
            alt={t('WORKSHOP_GALLERY_TITLE')}
            className={cn(SWIPE_ROW_CLASS, 'h-[clamp(4.5rem,11svh,9rem)]')}
          />
        </div>
      )}
    </section>
  );
}
