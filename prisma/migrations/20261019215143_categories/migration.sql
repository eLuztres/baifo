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

-- Every product category the shop had becomes a store category, with its products in it.
INSERT INTO "Category" ("slug", "name", "text", "scene", "sortOrder")
SELECT trim(both '-' from regexp_replace(lower(c."category"), '[^a-z0-9]+', '-', 'g')), jsonb_build_object('en', c."category"), '{}', '',
       (row_number() OVER (ORDER BY c."category"))::INTEGER - 1
FROM (SELECT DISTINCT "category" FROM "Product" WHERE trim("category") <> '') c
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "_CategoryToProduct" ("A", "B")
SELECT cat."id", p."id" FROM "Product" p
JOIN "Category" cat ON cat."slug" = trim(both '-' from regexp_replace(lower(p."category"), '[^a-z0-9]+', '-', 'g'))
ON CONFLICT DO NOTHING;

UPDATE "Product" SET "sourceImage" = "images"[1] WHERE "sourceImage" IS NULL AND cardinality("images") > 0;
