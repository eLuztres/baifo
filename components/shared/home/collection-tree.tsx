import CategoryTree, { type TreeBranch } from '@/components/admin/catalog/category-tree';
import type { MaterialGroup } from './materials';

interface CollectionTreeProps {
  groups: MaterialGroup[];
  /** Category covers by slug. */
  images: Map<string, string | null>;
  /** All pictures of each ring by id, shown as previews. */
  ringImages: Map<string, string[]>;
  title: string;
}

/** The whole collection at a glance: the admin's category tree, read-only, with each ring's pictures. */
export default function CollectionTree({ groups, images, ringImages, title }: CollectionTreeProps) {
  const branches: TreeBranch[] = groups.map((group) => ({
    slug: group.id,
    name: group.name,
    image: images.get(group.id) ?? group.rings[0]?.image ?? null,
    rings: group.rings.map((ring) => ({ id: ring.id, name: ring.name, isSoldOut: false, images: ringImages.get(ring.id) })),
  }));
  const slugById = new Map(groups.flatMap((group) => group.rings.map((ring) => [ring.id, ring.slug])));

  return (
    <CategoryTree
      branches={branches}
      selectedSlug=''
      label={title}
      categoryHref={null}
      ringHref={(ring, branch) => `/product/${slugById.get(ring.id)}?c=${branch.slug}`}
      isOpenByDefault
    />
  );
}
