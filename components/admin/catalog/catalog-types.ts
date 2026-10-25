/** A ring as the admin's category tree shows it. */
export interface CatalogCard {
  id: string;
  name: string;
  images: string[];
  price: string;
  isSoldOut: boolean;
  isReserved: boolean;
  /** Names of the other categories it is in. */
  otherCategories: string[];
  /** The listing it came from, if any: then it is edited in the listing editor, which saves by itself. */
  listingId?: string;
}

/** One branch of the tree: a category with its rings. */
export interface CatalogBranch {
  /** The category's slug, or UNCATEGORIZED for rings without any category. */
  slug: string;
  /** Empty for the rings without category. */
  categoryId: string;
  name: string;
  text: string;
  image: string | null;
  rings: CatalogCard[];
}

export const UNCATEGORIZED = 'none';
