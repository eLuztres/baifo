-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "scoutId" UUID;

-- CreateTable
CREATE TABLE "Scout" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submissionId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "title" TEXT,
    "actorType" TEXT NOT NULL,
    "actorName" TEXT,
    "actorId" TEXT,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Scout_code_key" ON "Scout"("code");

-- CreateIndex
CREATE INDEX "ListingEvent_submissionId_createdAt_idx" ON "ListingEvent"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingEvent_createdAt_idx" ON "ListingEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

