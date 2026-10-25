-- Titles and descriptions in every shop language instead of one English description.
ALTER TABLE "Submission" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
UPDATE "Submission" SET "translations" = jsonb_build_object('en', jsonb_build_object('description', "descriptionEn"))
  WHERE "descriptionEn" IS NOT NULL;
ALTER TABLE "Submission" DROP COLUMN "descriptionEn";

-- The category is kept by slug now, so a renamed category can't get lost.
UPDATE "Submission" AS s SET "category" = c."slug" FROM "Category" AS c WHERE s."category" = c."name"->>'es';
