-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "remindedAt" TIMESTAMP(6),
ALTER COLUMN "payToken" SET DEFAULT gen_random_uuid()::text;
