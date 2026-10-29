import DarkRoomHero from '@/components/shared/home/dark-room-hero';
import { getHeroPictures } from '@/components/shared/home/hero-pictures';
import RingSpace from '@/components/shared/home/ring-space';
import SceneHero from '@/components/shared/home/scene-hero';
import ShowroomSection from '@/components/shared/home/showroom-section';
import WorkshopSection from '@/components/shared/home/workshop-section';
import ContactSection from '@/components/shared/home/contact-section';
import { SECTION_IDS } from '@/components/shared/home/one-page';
import OnePageScroller from '@/components/shared/home/one-page-scroller';
import onePage from '@/components/shared/home/one-page.module.css';
import room from '@/components/shared/home/dark-room.module.css';
import { getInStockRings, getRingSummaries, inPlaces } from '@/components/shared/home/in-stock-rings';
import { pickShowroomRings } from '@/components/shared/home/materials';
import { getStoreCategories } from '@/lib/actions/category.actions';
import { BRAND } from '@/lib/brand';
import { getVisitorPlaceIds } from '@/lib/places';
import { cn, formatPriceTag } from '@/lib/utils';
import cutouts from '@/brand/cutouts.json';

const MIN_SPACE_RINGS = 4;
const CUTOUT_SLUGS = new Set<string>(cutouts);

export default async function HomePage() {
  // A light list of every listing in the visitor's places gives the counts; only the few shown are loaded in full.
  const [summaries, placeIds, storeCategories] = await Promise.all([getRingSummaries(), getVisitorPlaceIds(), getStoreCategories()]);
  const placedSummaries = inPlaces(summaries, placeIds);
  const { ids, counts } = pickShowroomRings(storeCategories, placedSummaries, CUTOUT_SLUGS);
  const rings = await getInStockRings({ id: { in: ids } });

  // Only rings with a cut-out picture (transparent background) can float in the opening scene.
  const spaceRings = rings
    .filter((ring) => CUTOUT_SLUGS.has(ring.slug))
    .map((ring) => ({
      slug: ring.slug,
      name: ring.name,
      price: ring.price && formatPriceTag(Number(ring.price)),
      image: `/brand/products/cutout/${ring.slug}.webp`,
    }));

  const heroPictures = getHeroPictures();
  // The listing pages swipe on to the next one, so the first of the store starts the feed.
  const feedHref = BRAND.hasSwipeToNext && placedSummaries[0] ? `/product/${placedSummaries[0].slug}` : undefined;

  return (
    <div className={onePage.onePage}>
      {/* The scene's newspaper opens below it: scrolling down from the goat reads on in /explore. */}
      <OnePageScroller belowHomeHref={heroPictures.length > 0 ? '/explore' : undefined} />
      <section id={SECTION_IDS.home} className={cn(room.room, onePage.home)}>
        {heroPictures.length > 0 ? (
          <SceneHero pictures={heroPictures} feedHref={feedHref} />
        ) : spaceRings.length >= MIN_SPACE_RINGS ? (
          <RingSpace rings={spaceRings} />
        ) : (
          <DarkRoomHero image={BRAND.heroImage} />
        )}
      </section>
      <ShowroomSection rings={rings} counts={counts} storeCategories={storeCategories} />
      <WorkshopSection />
      <ContactSection />
    </div>
  );
}
