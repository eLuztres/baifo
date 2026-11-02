-- #436: the sports gear listings move to "Deporte y movimiento" (a listing not in this database is skipped).
CREATE TEMP TABLE "SportListing" ("productSlug" TEXT PRIMARY KEY);
INSERT INTO "SportListing" VALUES
  ('vitrina-1-tabla-de-surf-6-2-casi-nueva'),
  ('vitrina-2-surf-skate-carver-para-practicar-en-tier'),
  ('vitrina-3-neopreno-4-3-talla-m'),
  ('vitrina-4-bici-de-paseo-con-cesta'),
  ('vitrina-33-quedada-de-surf-skate-al-atardecer'),
  ('vitrina-41-busco-longboard-de-9-pies'),
  ('vitrina-45-busco-bici-para-nino-de-6-anos'),
  ('busco-tabla-de-surf-d2d543'),
  ('bicicleta-de-paseo-turquesa-280483'),
  ('bicicleta-de-paseo-para-hombre-0e8b93');

CREATE TEMP TABLE "SportProduct" AS
SELECT p."id" AS "productId" FROM "Product" p JOIN "SportListing" s ON s."productSlug" = p."slug";

-- Every listing stays in exactly one category.
DELETE FROM "_CategoryToProduct" WHERE "B" IN (SELECT "productId" FROM "SportProduct");
INSERT INTO "_CategoryToProduct" ("A", "B")
SELECT c."id", sp."productId" FROM "SportProduct" sp CROSS JOIN "Category" c WHERE c."slug" = 'deporte';
UPDATE "Product" SET "category" = 'Deporte y movimiento' WHERE "id" IN (SELECT "productId" FROM "SportProduct");
UPDATE "Submission" SET "category" = 'deporte' WHERE "productId" IN (SELECT "productId" FROM "SportProduct");

DROP TABLE "SportProduct";
DROP TABLE "SportListing";
