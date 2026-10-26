import CompactHero from '@/components/shared/home/compact-hero';
import CompactContact from '@/components/shared/home/compact-contact';
import HomeActions from '@/components/shared/home/home-actions';
import RingSpace from '@/components/shared/home/ring-space';
import ShowroomSection from '@/components/shared/home/showroom-section';
import { SECTION_IDS } from '@/components/shared/home/one-page';
import room from '@/components/shared/home/dark-room.module.css';
import { getInStockRings, inPlaces } from '@/components/shared/home/in-stock-rings';
import { getVisitorPlaceIds } from '@/lib/places';
import { formatPriceTag } from '@/lib/utils';
import cutouts from '@/brand/cutouts.json';

const MIN_SPACE_RINGS = 4;
const CUTOUT_SLUGS = new Set<string>(cutouts);

export default async function HomePage() {
  // One query feeds the opening scene, the showroom and the shop; only the visitor's places.
  const [allRings, placeIds] = await Promise.all([getInStockRings(), getVisitorPlaceIds()]);
  const rings = inPlaces(allRings, placeIds);

  // Only rings with a cut-out picture (transparent background) can float in the opening scene.
  const spaceRings = rings
    .filter((ring) => CUTOUT_SLUGS.has(ring.slug))
    .map((ring) => ({
      slug: ring.slug,
      name: ring.name,
      price: ring.price && formatPriceTag(Number(ring.price)),
      image: `/brand/products/cutout/${ring.slug}.webp`,
    }));

  return (
    <div className='space-y-10 sm:space-y-14'>
      {spaceRings.length >= MIN_SPACE_RINGS ? (
        <section id={SECTION_IDS.home} className={room.room}>
          <RingSpace rings={spaceRings} />
        </section>
      ) : (
        <CompactHero />
      )}
      <HomeActions />
      <ShowroomSection rings={rings} />
      <CompactContact />
    </div>
  );
}
