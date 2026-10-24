-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "payToken" SET DEFAULT gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "MarketplaceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "listingsEmail" TEXT,
    "sendOnPublish" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceSettings_pkey" PRIMARY KEY ("id")
);
