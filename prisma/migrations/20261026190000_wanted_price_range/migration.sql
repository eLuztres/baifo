-- A wanted ad's budget is a range: price is its lower end, priceMax its upper end.
ALTER TABLE "Submission" ADD COLUMN "priceMax" DECIMAL(12,2);
ALTER TABLE "Product" ADD COLUMN "priceMax" DECIMAL(12,2);
