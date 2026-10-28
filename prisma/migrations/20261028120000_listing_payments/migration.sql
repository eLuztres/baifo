-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "consentAt" TIMESTAMP(6),
ADD COLUMN     "consentSource" TEXT,
ADD COLUMN     "consentTextVersion" TEXT,
ADD COLUMN     "payCode" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(6);

-- Listings already waiting for payment count their time from their last change.
UPDATE "Submission" SET "sentAt" = "updatedAt" WHERE "status" = 'AWAITING_PAYMENT';

-- CreateTable
CREATE TABLE "ListingFee" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submissionId" UUID,
    "title" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payCode" TEXT,
    "recordedBy" TEXT,
    "paidAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingFee_paidAt_idx" ON "ListingFee"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_payCode_key" ON "Submission"("payCode");

-- AddForeignKey
ALTER TABLE "ListingFee" ADD CONSTRAINT "ListingFee_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
