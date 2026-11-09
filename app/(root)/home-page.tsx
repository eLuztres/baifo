import DarkRoomHero from '@/components/shared/home/dark-room-hero';
import { getHeroPictures } from '@/components/shared/home/hero-pictures';
import RingSpace from '@/components/shared/home/ring-space';
import SceneHero from '@/components/shared/home/scene-hero';
import { SECTION_IDS } from '@/components/shared/home/one-page';
import onePage from '@/components/shared/home/one-page.module.css';
import room from '@/components/shared/home/dark-room.module.css';
import { getInStockRings, inPlaces } from '@/components/shared/home/in-stock-rings';
import { BRAND } from '@/lib/brand';
import { getVisitorPlaceIds } from '@/lib/places';
import { cn, formatPriceTag } from '@/lib/utils';
import cutouts from '@/brand/cutouts.json';

const MIN_SPACE_RINGS = 4;

export default async function HomePage() {
  // Only rings with a cut-out picture (transparent background) can float in the opening scene, from the visitor's places.
  const [rings, placeIds] = await Promise.all([getInStockRings({ slug: { in: cutouts } }), getVisitorPlaceIds()]);
  const spaceRings = inPlaces(rings, placeIds)
    .map((ring) => ({
      slug: ring.slug,
      name: ring.name,
      price: ring.price && formatPriceTag(Number(ring.price)),
      image: `/brand/products/cutout/${ring.slug}.webp`,
    }));

  const heroPictures = getHeroPictures();

  return (
    // One fixed screen: only its button opens the listings, so no swipe lands on a page still loading.
    <div className={onePage.fixedHome}>
      <section id={SECTION_IDS.home} className={cn(room.room, onePage.home)}>
        {heroPictures.length > 0 ? (
          <SceneHero pictures={heroPictures} />
        ) : spaceRings.length >= MIN_SPACE_RINGS ? (
          <RingSpace rings={spaceRings} />
        ) : (
          <DarkRoomHero image={BRAND.heroImage} />
        )}
      </section>
    </div>
  );
}
