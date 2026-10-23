-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "previousImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sourceImage" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "text" JSONB NOT NULL,
    "image" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scene" TEXT NOT NULL,
    "sceneVariants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToProduct" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_CategoryToProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The store's existing categories, and their rings matched by name and description as the shop did until now.
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sceneVariants", "sortOrder") VALUES ('lava', '{}', '{}', '/brand/categories/lava-cover.jpg', ARRAY['lava', 'volcán', 'arena']::TEXT[], 'A dramatic volcano landscape in Fuerteventura at dusk: black porous lava rock in the foreground, rivers of glowing orange lava and rising smoke behind it, fiery red-orange light against a dark sky, high contrast and powerful', ARRAY['black volcanic sand with soft wind ripples in front', 'glowing embers drifting through the air', 'the crater rim of an erupting volcano far behind, softly out of focus']::TEXT[], 0);
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sceneVariants", "sortOrder") VALUES ('ash', '{}', '{}', '/brand/categories/ash-cover.jpg', ARRAY['ceniza']::TEXT[], 'A quiet, misty world of volcanic ash: soft drifts of fine grey ash with delicate wind ripples, the hazy silhouette of the Cumbre Vieja volcano far behind, muted silver-grey and lilac tones, soft diffuse twilight, calm and melancholic', ARRAY['a weathered piece of pumice nearby', 'fine ash still drifting in a pale beam of light', 'a few small dark cinders scattered in the ash']::TEXT[], 1);
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sceneVariants", "sortOrder") VALUES ('sea', '{}', '{}', '/brand/categories/sea-cover.jpg', ARRAY['vidrio', 'santa lucía', 'playa']::TEXT[], 'A bright sunny Atlantic beach: wet golden sand at the waterline with frosted sea glass pebbles in turquoise and white, crystal clear turquoise water and white foam behind, fresh airy daylight, light and summery', ARRAY['the thin foam edge of a wave just beside', 'a small Santa Lucía shell eye and a piece of driftwood nearby', 'a shallow tide pool reflecting the blue sky']::TEXT[], 2);
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sceneVariants", "sortOrder") VALUES ('opal', '{}', '{}', '/brand/categories/opal-cover.jpg', ARRAY['ópalo']::TEXT[], 'A dreamy, magical scene of opal fire: deep black velvet scattered with rough opal fragments flashing blue, green and pink, rainbow light refractions and tiny sparkles floating in the dark, iridescent and mysterious', ARRAY['a single large raw opal glowing softly behind', 'a trail of fine opal flakes across dark slate', 'midnight-blue silk with soft iridescent bokeh']::TEXT[], 3);
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sceneVariants", "sortOrder") VALUES ('gold', '{}', '{}', '/brand/categories/gold-cover.jpg', ARRAY['oro']::TEXT[], 'Simple and minimal, with gold everywhere: a smooth surface of gold silk, flakes of real gold leaf, a soft warm golden background, bright high-key golden light, clean, radiant and luxurious', ARRAY['gold leaf flakes floating in the air, warm bokeh', 'a brushed-gold plate with a single fold of gold silk', 'a curl of gold leaf catching the light']::TEXT[], 4);
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sceneVariants", "sortOrder") VALUES ('azurite', '{}', '{}', '/brand/categories/azurite-cover.jpg', ARRAY['azurita']::TEXT[], 'A cool mineral cabinet: wet dark slate beside a raw azurite specimen with deep blue crystals and veins of green malachite, cool blue-teal light, crisp, clear and precise', ARRAY['small polished azurite and malachite beads out of focus', 'a split geode with blue crystals glowing behind', 'cool blue-green reflections on the wet slate']::TEXT[], 5);
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sceneVariants", "sortOrder") VALUES ('wood', '{}', '{}', '/brand/categories/wood-cover.jpg', ARRAY['madera', 'boj', 'olivo', 'iroko', 'palisandro', 'eucalipto', 'sándalo', 'ébano']::TEXT[], 'An artistic woodturning workshop: the cross-section of an old tree trunk with its growth rings, curled wood shavings from the lathe and raw linen, warm honey-coloured sunlight through dusty air, natural and handmade', ARRAY['olive wood shavings and a carving gouge softly out of focus', 'a polished boxwood block and fine sawdust caught in a sunbeam', 'a weathered oak workbench with the lathe softly out of focus behind']::TEXT[], 6);
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sceneVariants", "sortOrder") VALUES ('metal', '{}', '{}', '/brand/categories/metal-cover.jpg', ARRAY['plata', 'cobre', 'latón', 'acero']::TEXT[], 'An industrial metal workshop: a dark steel workbench with raw bars and wire of silver, copper and brass, bright sparks from a grinder in the background, cool steel-blue light with warm copper reflections, crisp and graphic', ARRAY['a jeweller''s anvil and a small hammer softly out of focus', 'a polished copper sheet reflecting warm light', 'brass and silver filings glittering on the steel']::TEXT[], 7);
INSERT INTO "_CategoryToProduct" ("A", "B") SELECT c."id", p."id" FROM "Category" c, "Product" p WHERE c."slug" = 'lava' AND (p."name" || ' ' || p."description") ~* 'lava|volc[aá]n|arena';
INSERT INTO "_CategoryToProduct" ("A", "B") SELECT c."id", p."id" FROM "Category" c, "Product" p WHERE c."slug" = 'ash' AND (p."name" || ' ' || p."description") ~* 'ceniza';
INSERT INTO "_CategoryToProduct" ("A", "B") SELECT c."id", p."id" FROM "Category" c, "Product" p WHERE c."slug" = 'sea' AND (p."name" || ' ' || p."description") ~* 'vidrio|santa luc[ií]a|playa';
INSERT INTO "_CategoryToProduct" ("A", "B") SELECT c."id", p."id" FROM "Category" c, "Product" p WHERE c."slug" = 'opal' AND (p."name" || ' ' || p."description") ~* '[oó]palo';
INSERT INTO "_CategoryToProduct" ("A", "B") SELECT c."id", p."id" FROM "Category" c, "Product" p WHERE c."slug" = 'gold' AND (p."name" || ' ' || p."description") ~* '\yoro\y';
INSERT INTO "_CategoryToProduct" ("A", "B") SELECT c."id", p."id" FROM "Category" c, "Product" p WHERE c."slug" = 'azurite' AND (p."name" || ' ' || p."description") ~* 'azurita';
INSERT INTO "_CategoryToProduct" ("A", "B") SELECT c."id", p."id" FROM "Category" c, "Product" p WHERE c."slug" = 'wood' AND (p."name" || ' ' || p."description") ~* 'madera|boj|olivo|iroko|palisandro|eucalipto|s[aá]ndalo|[eé]bano';
INSERT INTO "_CategoryToProduct" ("A", "B") SELECT c."id", p."id" FROM "Category" c, "Product" p WHERE c."slug" = 'metal' AND (p."name" || ' ' || p."description") ~* 'plata|cobre|lat[oó]n|acero';
INSERT INTO "Category" ("slug", "name", "text", "image", "keywords", "scene", "sceneVariants", "sortOrder") VALUES ('carbono', '{"en": "Carbon", "es": "Carbono", "fr": "Carbone"}', '{"en": "Glossy black carbon fibre, light as air and strong as steel.", "es": "Fibra de carbono negra y brillante, ligera como el aire y fuerte como el acero.", "fr": "Fibre de carbone noire et brillante, légère comme l''air et solide comme l''acier."}', '/brand/categories/carbono-cover.jpg', ARRAY['carbono', 'fibra de carbono']::TEXT[], 'A futuristic deep-space scene: a glossy black carbon-fibre weave surface floating in space, a colourful nebula and stars behind, cold blue and violet rim light, sleek, high-tech and otherworldly', ARRAY['a planet with glowing rings far behind', 'thin streaks of blue light like a starship passing', 'tiny floating carbon fragments catching violet light']::TEXT[], 8);
INSERT INTO "_CategoryToProduct" ("A", "B") SELECT c."id", p."id" FROM "Category" c, "Product" p WHERE c."slug" = 'carbono' AND (p."name" || ' ' || p."description") ~* 'carbono';
UPDATE "Product" SET "sourceImage" = "images"[1] WHERE "sourceImage" IS NULL AND cardinality("images") > 0;
