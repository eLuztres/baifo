-- A Mercadillo's row starts with its heading, as on Amazon: no first card, so no cover picture.
ALTER TABLE "Mercadillo" DROP COLUMN "image";
