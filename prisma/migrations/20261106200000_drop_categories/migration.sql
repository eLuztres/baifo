-- Baifo has etiquetas instead of categories (#539).

-- Older listings get the submission that the editor and the etiquetas need.
INSERT INTO "Seller" ("waId") VALUES ('baifo') ON CONFLICT ("waId") DO NOTHING;

INSERT INTO "Submission" (
  "sellerId", "status", "productId", "createdByAdmin", "usesAi", "type",
  "title", "shortTitle", "description", "translations", "images", "rawImages", "aiImages",
  "condition", "price", "priceMode", "expiresAt", "placeId", "mercadilloId",
  "serviceType", "startsAt", "address", "createdAt", "updatedAt"
)
SELECT
  COALESCE(p."sellerId", (SELECT "id" FROM "Seller" WHERE "waId" = 'baifo')),
  CASE WHEN p."stock" > 0 THEN 'LIVE' ELSE 'SOLD' END::"SubmissionStatus",
  p."id", true, false, p."type",
  p."name", p."shortName", p."description",
  -- The product keeps { name, description, shortName } per language; the submission { title, description, short }.
  COALESCE((
    SELECT jsonb_object_agg(t.key, jsonb_strip_nulls(jsonb_build_object(
      'title', t.value->'name', 'description', t.value->'description', 'short', t.value->'shortName')))
    FROM jsonb_each(CASE WHEN jsonb_typeof(p."translations") = 'object' THEN p."translations" ELSE '{}'::jsonb END) t
  ), '{}'::jsonb),
  p."images", p."images", p."images",
  p."condition", p."price", p."priceMode", p."expiresAt", p."placeId", p."mercadilloId",
  p."serviceType", p."startsAt", p."address", p."createdAt", now()
FROM "Product" p
WHERE NOT EXISTS (SELECT 1 FROM "Submission" s WHERE s."productId" = p."id");

-- Each category becomes an etiqueta (or joins the one with its Spanish name) on the same listings.
INSERT INTO "Tag" ("names")
SELECT c."name" FROM "Category" c
WHERE NOT EXISTS (SELECT 1 FROM "Tag" t WHERE lower(t."names"->>'es') = lower(c."name"->>'es'));

INSERT INTO "_SubmissionToTag" ("A", "B")
SELECT DISTINCT s."id", t."id"
FROM "_CategoryToProduct" cp
JOIN "Category" c ON c."id" = cp."A"
JOIN "Submission" s ON s."productId" = cp."B"
JOIN LATERAL (
  SELECT "id" FROM "Tag" WHERE lower("names"->>'es') = lower(c."name"->>'es') ORDER BY "createdAt" LIMIT 1
) t ON true
ON CONFLICT DO NOTHING;

DROP TABLE "_CategoryToProduct";
DROP TABLE "Category";
ALTER TABLE "Product" DROP COLUMN "category";
ALTER TABLE "Submission" DROP COLUMN "categories";
