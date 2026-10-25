-- Italian names of Baifo's store categories; a name an admin already set in Italian is kept.
UPDATE "Category" SET "name" = "name" || '{"it": "Casa e arredamento"}' WHERE "slug" = 'casa' AND NOT ("name" ? 'it');
UPDATE "Category" SET "name" = "name" || '{"it": "Abbigliamento e moda"}' WHERE "slug" = 'moda' AND NOT ("name" ? 'it');
UPDATE "Category" SET "name" = "name" || '{"it": "Elettronica"}' WHERE "slug" = 'electronica' AND NOT ("name" ? 'it');
UPDATE "Category" SET "name" = "name" || '{"it": "Sport e surf"}' WHERE "slug" = 'deporte' AND NOT ("name" ? 'it');
UPDATE "Category" SET "name" = "name" || '{"it": "Bambini e neonati"}' WHERE "slug" = 'ninos' AND NOT ("name" ? 'it');
UPDATE "Category" SET "name" = "name" || '{"it": "Giardino e fai da te"}' WHERE "slug" = 'jardin' AND NOT ("name" ? 'it');
UPDATE "Category" SET "name" = "name" || '{"it": "Bici e motori"}' WHERE "slug" = 'motor' AND NOT ("name" ? 'it');
UPDATE "Category" SET "name" = "name" || '{"it": "Altro"}' WHERE "slug" = 'otros' AND NOT ("name" ? 'it');
