-- Every listing is exactly one of four types, and any type goes in any category ("like a newspaper").
-- Before, the type was kind + isWanted plus the special categories servicios, busco and eventos.
CREATE TYPE "ListingType" AS ENUM ('PRODUCT', 'WANTED', 'SERVICE', 'EVENT');

ALTER TABLE "Product" ADD COLUMN "type" "ListingType" NOT NULL DEFAULT 'PRODUCT';
ALTER TABLE "Submission" ADD COLUMN "type" "ListingType" NOT NULL DEFAULT 'PRODUCT';

-- 1. The type from the old columns; a product in Busco (or one of its subcategories) is a wanted ad.
UPDATE "Product" SET "type" = 'SERVICE' WHERE "kind" = 'service';
UPDATE "Product" SET "type" = 'EVENT' WHERE "kind" = 'event';
UPDATE "Product" p SET "type" = 'WANTED'
WHERE p."kind" = 'product'
  AND (
    EXISTS (
      SELECT 1 FROM "_CategoryToProduct" cp
      JOIN "Category" c ON c."id" = cp."A"
      LEFT JOIN "Category" parent ON parent."id" = c."parentId"
      WHERE cp."B" = p."id" AND 'busco' IN (c."slug", parent."slug")
    )
    OR EXISTS (SELECT 1 FROM "Submission" s WHERE s."productId" = p."id" AND s."isWanted")
  );

UPDATE "Submission" SET "type" = 'SERVICE' WHERE "kind" = 'service';
UPDATE "Submission" SET "type" = 'EVENT' WHERE "kind" = 'event';
UPDATE "Submission" s SET "type" = 'WANTED'
WHERE s."kind" = 'product'
  AND (
    s."isWanted"
    OR s."category" IN (
      SELECT c."slug" FROM "Category" c
      LEFT JOIN "Category" parent ON parent."id" = c."parentId"
      WHERE 'busco' IN (c."slug", parent."slug")
    )
    OR EXISTS (SELECT 1 FROM "Product" p WHERE p."id" = s."productId" AND p."type" = 'WANTED')
  );

-- 2. Subcategories that duplicate a store category merge into it (busco-casa → casa, …; casa-y-jardin → casa).
CREATE TEMP TABLE "CategoryMerge" AS
SELECT child."id" AS "fromId", child."slug" AS "fromSlug", goods."id" AS "toId", goods."slug" AS "toSlug", goods."name"->>'es' AS "toName"
FROM "Category" child
JOIN "Category" parent ON parent."id" = child."parentId"
JOIN "Category" goods ON goods."parentId" IS NULL
  AND goods."slug" NOT IN ('busco', 'servicios', 'eventos')
  AND goods."slug" = CASE
    WHEN parent."slug" = 'busco' THEN regexp_replace(child."slug", '^busco-', '')
    WHEN child."slug" = 'casa-y-jardin' THEN 'casa'
  END
WHERE parent."slug" IN ('busco', 'servicios');

INSERT INTO "_CategoryToProduct" ("A", "B")
SELECT m."toId", cp."B" FROM "_CategoryToProduct" cp JOIN "CategoryMerge" m ON m."fromId" = cp."A"
ON CONFLICT DO NOTHING;
UPDATE "Product" p SET "category" = m."toName"
FROM "_CategoryToProduct" cp JOIN "CategoryMerge" m ON m."fromId" = cp."A"
WHERE cp."B" = p."id" AND m."toName" IS NOT NULL;
UPDATE "Submission" s SET "category" = m."toSlug" FROM "CategoryMerge" m WHERE s."category" = m."fromSlug";
DELETE FROM "Category" WHERE "id" IN (SELECT "fromId" FROM "CategoryMerge");
DROP TABLE "CategoryMerge";

-- 3. The other Busco subcategories lose the "busco-" in their link name (busco-vivienda → vivienda) when it's free.
CREATE TEMP TABLE "CategoryRename" AS
SELECT c."id", c."slug" AS "fromSlug", regexp_replace(c."slug", '^busco-', '') AS "toSlug"
FROM "Category" c
JOIN "Category" parent ON parent."id" = c."parentId"
WHERE parent."slug" = 'busco' AND c."slug" LIKE 'busco-%'
  AND NOT EXISTS (SELECT 1 FROM "Category" other WHERE other."slug" = regexp_replace(c."slug", '^busco-', ''));

UPDATE "Submission" s SET "category" = r."toSlug" FROM "CategoryRename" r WHERE s."category" = r."fromSlug";
UPDATE "Category" c SET "slug" = r."toSlug" FROM "CategoryRename" r WHERE c."id" = r."id";
DROP TABLE "CategoryRename";

-- 4. A listing only in Servicios, Busco or Eventos themselves goes to Otros, so none is left without a category.
INSERT INTO "_CategoryToProduct" ("A", "B")
SELECT (SELECT "id" FROM "Category" WHERE "slug" = 'otros'), cp."B"
FROM "_CategoryToProduct" cp
JOIN "Category" c ON c."id" = cp."A"
WHERE c."slug" IN ('busco', 'servicios', 'eventos')
  AND NOT EXISTS (
    SELECT 1 FROM "_CategoryToProduct" other
    JOIN "Category" oc ON oc."id" = other."A"
    WHERE other."B" = cp."B" AND oc."slug" NOT IN ('busco', 'servicios', 'eventos')
  )
ON CONFLICT DO NOTHING;
UPDATE "Submission" SET "category" = 'otros' WHERE "category" IN ('busco', 'servicios', 'eventos');

-- 5. Their subcategories become top-level categories: goods first, then the former services, then the former Busco, Otros last.
UPDATE "Category" c SET "parentId" = NULL, "sortOrder" = ranked."rank"
FROM (
  SELECT c2."id", (ROW_NUMBER() OVER (
    ORDER BY
      CASE WHEN c2."slug" = 'otros' THEN 3 WHEN parent."slug" = 'servicios' THEN 1 WHEN parent."slug" = 'busco' THEN 2 ELSE 0 END,
      c2."sortOrder", c2."createdAt"
  ) - 1)::int AS "rank"
  FROM "Category" c2
  LEFT JOIN "Category" parent ON parent."id" = c2."parentId"
  WHERE c2."slug" NOT IN ('busco', 'servicios', 'eventos')
    AND (c2."parentId" IS NULL OR parent."slug" IN ('busco', 'servicios', 'eventos'))
) ranked
WHERE c."id" = ranked."id";

DELETE FROM "Category" WHERE "slug" IN ('busco', 'servicios', 'eventos');

-- 6. The old columns go; the type-specific fields only where their type allows them.
ALTER TABLE "Product" DROP COLUMN "kind";
ALTER TABLE "Submission" DROP COLUMN "kind", DROP COLUMN "isWanted";

ALTER TABLE "Product" ADD CONSTRAINT "Product_priceMax_only_wanted" CHECK ("priceMax" IS NULL OR "type" = 'WANTED');
ALTER TABLE "Product" ADD CONSTRAINT "Product_serviceType_only_service" CHECK ("serviceType" IS NULL OR "type" = 'SERVICE');
ALTER TABLE "Product" ADD CONSTRAINT "Product_event_has_start" CHECK ("type" <> 'EVENT' OR "startsAt" IS NOT NULL);
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_priceMax_only_wanted" CHECK ("priceMax" IS NULL OR "type" = 'WANTED');
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_serviceType_only_service" CHECK ("serviceType" IS NULL OR "type" = 'SERVICE');
