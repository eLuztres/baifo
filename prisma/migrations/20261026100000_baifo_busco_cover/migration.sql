-- Cover of Baifo's wanted category ("Busco"); a picture an admin already chose is kept.
UPDATE "Category" SET "image" = '/brand/categories/busco.jpg' WHERE "slug" = 'busco' AND "image" IS NULL;
