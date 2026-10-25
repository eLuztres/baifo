-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "payToken" SET DEFAULT gen_random_uuid()::text;
