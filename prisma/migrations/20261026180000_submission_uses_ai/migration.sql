-- A listing whose photos and videos stay as uploaded, without AI pictures or video clean-up.
ALTER TABLE "Submission" ADD COLUMN "usesAi" BOOLEAN NOT NULL DEFAULT true;
