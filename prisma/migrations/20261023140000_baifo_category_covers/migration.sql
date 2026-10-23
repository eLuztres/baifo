-- Cover pictures of Baifo's store categories (public/brand/categories/).
UPDATE "Category" SET "image" = '/brand/categories/casa.jpg' WHERE "slug" = 'casa' AND "image" IS NULL;
UPDATE "Category" SET "image" = '/brand/categories/moda.jpg' WHERE "slug" = 'moda' AND "image" IS NULL;
UPDATE "Category" SET "image" = '/brand/categories/electronica.jpg' WHERE "slug" = 'electronica' AND "image" IS NULL;
UPDATE "Category" SET "image" = '/brand/categories/deporte.jpg' WHERE "slug" = 'deporte' AND "image" IS NULL;
UPDATE "Category" SET "image" = '/brand/categories/ninos.jpg' WHERE "slug" = 'ninos' AND "image" IS NULL;
UPDATE "Category" SET "image" = '/brand/categories/jardin.jpg' WHERE "slug" = 'jardin' AND "image" IS NULL;
UPDATE "Category" SET "image" = '/brand/categories/motor.jpg' WHERE "slug" = 'motor' AND "image" IS NULL;
UPDATE "Category" SET "image" = '/brand/categories/otros.jpg' WHERE "slug" = 'otros' AND "image" IS NULL;
