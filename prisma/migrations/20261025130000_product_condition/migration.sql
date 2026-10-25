-- How a second-hand item is (new, like_new, good, fair); empty for shops that don't use it.
ALTER TABLE "Product" ADD COLUMN "condition" TEXT;
