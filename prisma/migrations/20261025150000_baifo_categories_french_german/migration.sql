-- Baifo now also speaks French and German; categories an admin already translated keep their names.
UPDATE "Category" SET "name" = "name" || '{"fr": "Maison et meubles"}' WHERE "slug" = 'casa' AND NOT ("name" ? 'fr');
UPDATE "Category" SET "name" = "name" || '{"fr": "Vêtements et mode"}' WHERE "slug" = 'moda' AND NOT ("name" ? 'fr');
UPDATE "Category" SET "name" = "name" || '{"fr": "Électronique"}' WHERE "slug" = 'electronica' AND NOT ("name" ? 'fr');
UPDATE "Category" SET "name" = "name" || '{"fr": "Sport et surf"}' WHERE "slug" = 'deporte' AND NOT ("name" ? 'fr');
UPDATE "Category" SET "name" = "name" || '{"fr": "Enfants et bébés"}' WHERE "slug" = 'ninos' AND NOT ("name" ? 'fr');
UPDATE "Category" SET "name" = "name" || '{"fr": "Jardin et bricolage"}' WHERE "slug" = 'jardin' AND NOT ("name" ? 'fr');
UPDATE "Category" SET "name" = "name" || '{"fr": "Vélos et véhicules"}' WHERE "slug" = 'motor' AND NOT ("name" ? 'fr');
UPDATE "Category" SET "name" = "name" || '{"fr": "Instruments de musique"}' WHERE "slug" = 'instrumentos' AND NOT ("name" ? 'fr');
UPDATE "Category" SET "name" = "name" || '{"fr": "Autres"}' WHERE "slug" = 'otros' AND NOT ("name" ? 'fr');
UPDATE "Category" SET "name" = "name" || '{"de": "Haus und Möbel"}' WHERE "slug" = 'casa' AND NOT ("name" ? 'de');
UPDATE "Category" SET "name" = "name" || '{"de": "Kleidung und Mode"}' WHERE "slug" = 'moda' AND NOT ("name" ? 'de');
UPDATE "Category" SET "name" = "name" || '{"de": "Elektronik"}' WHERE "slug" = 'electronica' AND NOT ("name" ? 'de');
UPDATE "Category" SET "name" = "name" || '{"de": "Sport und Surfen"}' WHERE "slug" = 'deporte' AND NOT ("name" ? 'de');
UPDATE "Category" SET "name" = "name" || '{"de": "Kinder und Babys"}' WHERE "slug" = 'ninos' AND NOT ("name" ? 'de');
UPDATE "Category" SET "name" = "name" || '{"de": "Garten und Heimwerken"}' WHERE "slug" = 'jardin' AND NOT ("name" ? 'de');
UPDATE "Category" SET "name" = "name" || '{"de": "Fahrräder und Fahrzeuge"}' WHERE "slug" = 'motor' AND NOT ("name" ? 'de');
UPDATE "Category" SET "name" = "name" || '{"de": "Musikinstrumente"}' WHERE "slug" = 'instrumentos' AND NOT ("name" ? 'de');
UPDATE "Category" SET "name" = "name" || '{"de": "Sonstiges"}' WHERE "slug" = 'otros' AND NOT ("name" ? 'de');
