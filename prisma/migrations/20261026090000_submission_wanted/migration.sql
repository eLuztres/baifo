-- A listing the admin starts as "Busco": the AI writes it as a wanted ad and sorts it into a Busco subcategory.
ALTER TABLE "Submission" ADD COLUMN "isWanted" BOOLEAN NOT NULL DEFAULT false;
