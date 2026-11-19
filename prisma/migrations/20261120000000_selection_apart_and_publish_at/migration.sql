-- AlterTable
ALTER TABLE "Mercadillo" ADD COLUMN     "isApart" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "publishAt" TIMESTAMP(6);
