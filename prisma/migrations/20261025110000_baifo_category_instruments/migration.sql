-- Musical instruments as a store category, just before "otros", which stays last.
INSERT INTO "Category" ("slug", "name", "text", "scene", "sortOrder", "image") VALUES
  ('instrumentos', '{"es": "Instrumentos musicales", "en": "Musical instruments", "it": "Strumenti musicali"}', '{}', '', 7, '/brand/categories/instrumentos.jpg')
ON CONFLICT ("slug") DO NOTHING;
UPDATE "Category" SET "sortOrder" = 8 WHERE "slug" = 'otros' AND "sortOrder" = 7;
