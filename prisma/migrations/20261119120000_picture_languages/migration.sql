-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "pictureLanguages" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "pictureLanguages" JSONB NOT NULL DEFAULT '{}';
