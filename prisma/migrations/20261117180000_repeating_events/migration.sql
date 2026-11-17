-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "eventDateChanges" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "repeatFrequency" TEXT,
ADD COLUMN     "repeatMonthlyBy" TEXT,
ADD COLUMN     "repeatStart" TIMESTAMP(6),
ADD COLUMN     "repeatUntil" TIMESTAMP(6),
ADD COLUMN     "repeatWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
