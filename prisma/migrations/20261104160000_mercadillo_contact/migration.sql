-- #504: a Mercadillo has its own contact. Each takes the number most of its listings already show, with that person's OK.
ALTER TABLE "Mercadillo" ADD COLUMN "contactPhone" TEXT;

UPDATE "Mercadillo" m
SET "contactPhone" = (
  SELECT p."contactPhone" FROM "Product" p
  WHERE p."mercadilloId" = m."id" AND p."contactPhone" IS NOT NULL
  GROUP BY p."contactPhone"
  ORDER BY COUNT(*) DESC, p."contactPhone"
  LIMIT 1
);
