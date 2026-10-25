-- A service (babysitter, gardener …) is a product that never shows a price, only its contact.
ALTER TABLE "Product" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'product';

-- Subcategories, e.g. the kinds of services under "servicios".
ALTER TABLE "Category" ADD COLUMN     "parentId" UUID;
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Baifo's services, just before "otros", which stays last; admins add more subcategories later.
UPDATE "Category" SET "sortOrder" = 9 WHERE "slug" = 'otros' AND "sortOrder" = 8;
INSERT INTO "Category" ("slug", "name", "text", "scene", "sortOrder") VALUES
  ('servicios', '{"es": "Servicios", "en": "Services", "it": "Servizi", "fr": "Services", "de": "Dienstleistungen"}', '{}', '', 8)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Category" ("slug", "name", "text", "scene", "sortOrder", "parentId")
SELECT sub.slug, sub.name::jsonb, '{}', '', sub.sort_order, parent.id
FROM "Category" parent, (VALUES
  ('casa-y-jardin', '{"es": "Casa y jardín", "en": "Home and garden", "it": "Casa e giardino", "fr": "Maison et jardin", "de": "Haus und Garten"}', 0),
  ('ninos-y-mayores', '{"es": "Niños y mayores", "en": "Children and elderly care", "it": "Bambini e anziani", "fr": "Enfants et personnes âgées", "de": "Kinder und Senioren"}', 1),
  ('salud-y-bienestar', '{"es": "Salud y bienestar", "en": "Health and wellbeing", "it": "Salute e benessere", "fr": "Santé et bien-être", "de": "Gesundheit und Wohlbefinden"}', 2),
  ('clases', '{"es": "Clases", "en": "Lessons", "it": "Lezioni", "fr": "Cours", "de": "Unterricht"}', 3),
  ('tramites', '{"es": "Trámites y gestoría", "en": "Paperwork and advice", "it": "Pratiche e consulenza", "fr": "Démarches et conseil", "de": "Behördengänge und Beratung"}', 4),
  ('mascotas', '{"es": "Mascotas", "en": "Pets", "it": "Animali", "fr": "Animaux", "de": "Haustiere"}', 5)
) AS sub(slug, name, sort_order)
WHERE parent."slug" = 'servicios'
ON CONFLICT ("slug") DO NOTHING;
