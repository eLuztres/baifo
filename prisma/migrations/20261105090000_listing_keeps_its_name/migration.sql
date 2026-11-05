-- The name now lives on the listing alone. Each listing without one gets the name it was published with
-- (the product's brand), which also undoes renames by a later listing with the same number; else the number's name.
UPDATE "Submission" s
SET "sellerName" = COALESCE(NULLIF(p."brand", 'Particular'), sel."name")
FROM "Seller" sel, "Product" p
WHERE sel."id" = s."sellerId" AND p."id" = s."productId" AND s."sellerName" IS NULL AND sel."waId" <> 'baifo';

UPDATE "Submission" s
SET "sellerName" = sel."name"
FROM "Seller" sel
WHERE sel."id" = s."sellerId" AND s."productId" IS NULL AND s."sellerName" IS NULL AND sel."waId" <> 'baifo';
