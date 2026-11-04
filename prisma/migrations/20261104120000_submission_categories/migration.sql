-- A listing can be in several categories: the slugs become a list.
ALTER TABLE "Submission" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Submission" SET "categories" = ARRAY["category"] WHERE "category" IS NOT NULL;

-- A live listing may already have more on its product; a subcategory's parent comes along by itself, so it isn't listed.
UPDATE "Submission" s
SET "categories" = linked.slugs
FROM (
  SELECT j."B" AS product_id, array_agg(c."slug" ORDER BY c."sortOrder") AS slugs
  FROM "_CategoryToProduct" j
  JOIN "Category" c ON c."id" = j."A"
  WHERE NOT EXISTS (
    SELECT 1 FROM "_CategoryToProduct" other
    JOIN "Category" child ON child."id" = other."A"
    WHERE other."B" = j."B" AND child."parentId" = c."id"
  )
  GROUP BY j."B"
) linked
WHERE s."productId" = linked.product_id;

ALTER TABLE "Submission" DROP COLUMN "category";
