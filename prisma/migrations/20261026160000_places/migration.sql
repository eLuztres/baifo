-- Places on the island: every listing gets one, visitors filter by them. Baifo starts in Corralejo; the others show as "soon".
CREATE TABLE "Place" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Place_slug_key" ON "Place"("slug");

ALTER TABLE "Product" ADD COLUMN "placeId" UUID;
ALTER TABLE "Submission" ADD COLUMN "placeId" UUID;
ALTER TABLE "Product" ADD CONSTRAINT "Product_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Pin positions on public/brand/island.svg, from the towns' coordinates.
INSERT INTO "Place" ("slug", "name", "x", "y", "isLive", "sortOrder") VALUES
  ('corralejo', '{"es": "Corralejo", "en": "Corralejo", "it": "Corralejo", "fr": "Corralejo", "de": "Corralejo"}', 90.0, 6.7, true, 0),
  ('el-cotillo', '{"es": "El Cotillo", "en": "El Cotillo", "it": "El Cotillo", "fr": "El Cotillo", "de": "El Cotillo"}', 70.2, 12.9, false, 1),
  ('puerto-del-rosario', '{"es": "Puerto del Rosario", "en": "Puerto del Rosario", "it": "Puerto del Rosario", "fr": "Puerto del Rosario", "de": "Puerto del Rosario"}', 90.6, 37.3, false, 2),
  ('caleta-de-fuste', '{"es": "Caleta de Fuste", "en": "Caleta de Fuste", "it": "Caleta de Fuste", "fr": "Caleta de Fuste", "de": "Caleta de Fuste"}', 91.3, 51.3, false, 3),
  ('morro-jable', '{"es": "Morro Jable", "en": "Morro Jable", "it": "Morro Jable", "fr": "Morro Jable", "de": "Morro Jable"}', 23.6, 97.0, false, 4)
ON CONFLICT ("slug") DO NOTHING;

-- Everything listed so far was in Corralejo.
UPDATE "Product" SET "placeId" = (SELECT "id" FROM "Place" WHERE "slug" = 'corralejo') WHERE "placeId" IS NULL;
UPDATE "Submission" SET "placeId" = (SELECT "id" FROM "Place" WHERE "slug" = 'corralejo') WHERE "placeId" IS NULL;
