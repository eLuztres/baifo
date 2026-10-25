import DarkRoomHero from '@/components/shared/home/dark-room-hero';
import RingSpace from '@/components/shared/home/ring-space';
import ShowroomSection from '@/components/shared/home/showroom-section';
import WorkshopSection from '@/components/shared/home/workshop-section';
import ContactSection from '@/components/shared/home/contact-section';
import { SECTION_IDS } from '@/components/shared/home/one-page';
import OnePageScroller from '@/components/shared/home/one-page-scroller';
import onePage from '@/components/shared/home/one-page.module.css';
import room from '@/components/shared/home/dark-room.module.css';
import { getInStockRings } from '@/components/shared/home/in-stock-rings';
import { BRAND } from '@/lib/brand';
import { cn, formatPriceTag } from '@/lib/utils';
import cutouts from '@/brand/cutouts.json';

const MIN_SPACE_RINGS = 4;
const CUTOUT_SLUGS = new Set<string>(cutouts);

export default async function HomePage() {
  // One query feeds the opening scene, the showroom and the shop.
  const rings = await getInStockRings();

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
    <div className={onePage.onePage}>
      <OnePageScroller />
      <section id={SECTION_IDS.home} className={cn(room.room, onePage.home)}>
        {spaceRings.length >= MIN_SPACE_RINGS ? (
          <RingSpace rings={spaceRings} />
        ) : (
          <DarkRoomHero image={BRAND.heroImage} />
        )}
      </section>
      <ShowroomSection rings={rings} />
      <WorkshopSection />
      <ContactSection />
    </div>
  );
}
