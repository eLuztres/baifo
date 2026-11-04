-- #497: the first Mercadillo; the listings that say they are in the Magma shop join it.
INSERT INTO "Mercadillo" ("slug", "name", "text") VALUES (
  'magma',
  '{"es": "Magma", "en": "Magma", "it": "Magma", "fr": "Magma", "de": "Magma"}',
  '{"es": "Material de surf y wing de segunda mano. Se puede ver en persona en la tienda Magma, en Lajares.", "en": "Second-hand surf and wing gear. You can see it in person at the Magma shop in Lajares.", "it": "Attrezzatura da surf e wing di seconda mano. Si può vedere di persona nel negozio Magma, a Lajares.", "fr": "Matériel de surf et de wing d''occasion. À voir en personne à la boutique Magma, à Lajares.", "de": "Gebrauchtes Surf- und Wing-Material. Du kannst es dir im Magma-Laden in Lajares ansehen."}'
);

UPDATE "Product"
SET "mercadilloId" = (SELECT "id" FROM "Mercadillo" WHERE "slug" = 'magma')
WHERE "description" ILIKE '%tienda Magma%';

UPDATE "Submission"
SET "mercadilloId" = (SELECT "id" FROM "Mercadillo" WHERE "slug" = 'magma')
WHERE "description" ILIKE '%tienda Magma%'
   OR "productId" IN (SELECT "id" FROM "Product" WHERE "description" ILIKE '%tienda Magma%');
