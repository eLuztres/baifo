-- The admin chooses per listing between their own text (only translated) and the AI's, and per photo between original and AI picture.
ALTER TABLE "Submission" ADD COLUMN     "textMode" TEXT NOT NULL DEFAULT 'ai';
ALTER TABLE "Submission" ADD COLUMN     "originalTitle" TEXT;
ALTER TABLE "Submission" ADD COLUMN     "textVersions" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Submission" ADD COLUMN     "aiImages" TEXT[] DEFAULT ARRAY[]::TEXT[];
