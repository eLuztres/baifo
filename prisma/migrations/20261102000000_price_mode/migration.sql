-- One way to say how a price reads, for every listing type; a wanted ad's budget becomes a single "up to" amount.
CREATE TYPE "PriceMode" AS ENUM ('NONE', 'FIXED', 'FROM', 'UP_TO');

ALTER TABLE "Product" ADD COLUMN "priceMode" "PriceMode" NOT NULL DEFAULT 'FIXED';
ALTER TABLE "Submission" ADD COLUMN "priceMode" "PriceMode";

-- A wanted ad keeps the top of its budget.
UPDATE "Product" SET "price" = "priceMax" WHERE "type" = 'WANTED' AND "priceMax" IS NOT NULL;
UPDATE "Submission" SET "price" = "priceMax" WHERE "type" = 'WANTED' AND "priceMax" IS NOT NULL;

-- An event's 0 is "free", so it keeps FIXED; elsewhere no amount means no price.
UPDATE "Product" SET "priceMode" = CASE
  WHEN "type" = 'EVENT' THEN 'FIXED'
  WHEN "price" <= 0 THEN 'NONE'
  WHEN "type" = 'WANTED' THEN 'UP_TO'
  WHEN "type" = 'SERVICE' THEN 'FROM'
  ELSE 'FIXED'
END::"PriceMode";

-- A listing the AI hasn't written yet keeps NULL, so its price mode is still read from the words.
UPDATE "Submission" SET "priceMode" = CASE
  WHEN "type" = 'EVENT' THEN 'FIXED'
  WHEN "price" IS NULL OR "price" <= 0 THEN 'NONE'
  WHEN "type" = 'WANTED' THEN 'UP_TO'
  WHEN "type" = 'SERVICE' THEN 'FROM'
  ELSE 'FIXED'
END::"PriceMode"
WHERE "title" IS NOT NULL;

ALTER TABLE "Product" DROP CONSTRAINT "Product_priceMax_only_wanted";
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_priceMax_only_wanted";
ALTER TABLE "Product" DROP COLUMN "priceMax";
ALTER TABLE "Submission" DROP COLUMN "priceMax";
