-- Services made with the first service wizard have no listing, so Anuncios can't show them; each gets a live one.
INSERT INTO "Seller" ("waId")
SELECT DISTINCT COALESCE(NULLIF(regexp_replace(p."contactPhone", '\D', '', 'g'), ''), 'baifo')
FROM "Product" p
WHERE p."kind" = 'service' AND NOT EXISTS (SELECT 1 FROM "Submission" s WHERE s."productId" = p."id")
ON CONFLICT ("waId") DO NOTHING;

INSERT INTO "Submission" (
  "sellerId", "status", "kind", "createdByAdmin", "images", "rawImages", "title", "description",
  "category", "productId", "expiresAt", "hasContactConsent", "paidAt", "paymentProvider", "updatedAt"
)
SELECT seller."id", 'LIVE', 'service', true, p."images", p."images", p."name", p."description",
  kind_of_service."slug", p."id", p."expiresAt", p."contactPhone" IS NOT NULL, p."createdAt", 'Admin', now()
FROM "Product" p
JOIN "Seller" seller ON seller."waId" = COALESCE(NULLIF(regexp_replace(p."contactPhone", '\D', '', 'g'), ''), 'baifo')
LEFT JOIN LATERAL (
  SELECT c."slug" FROM "_CategoryToProduct" link JOIN "Category" c ON c."id" = link."A"
  WHERE link."B" = p."id" AND c."parentId" IS NOT NULL
  LIMIT 1
) kind_of_service ON true
WHERE p."kind" = 'service' AND NOT EXISTS (SELECT 1 FROM "Submission" s WHERE s."productId" = p."id");
