-- Cover of Baifo's services category; a picture an admin already chose is kept.
UPDATE "Category" SET "image" = '/brand/categories/servicios.jpg' WHERE "slug" = 'servicios' AND "image" IS NULL;
