-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('COLLECTING', 'PROCESSING', 'IN_REVIEW', 'AWAITING_PAYMENT', 'LIVE', 'EXPIRED', 'SOLD', 'REJECTED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "expiresAt" TIMESTAMP(6),
ADD COLUMN     "sellerId" UUID;

-- CreateTable
CREATE TABLE "Seller" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "waId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sellerId" UUID NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'COLLECTING',
    "mediaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawText" TEXT NOT NULL DEFAULT '',
    "title" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "category" TEXT,
    "price" DECIMAL(12,2),
    "plan" TEXT,
    "crossPostFacebook" BOOLEAN NOT NULL DEFAULT false,
    "crossPostWallapop" BOOLEAN NOT NULL DEFAULT false,
    "hasContactConsent" BOOLEAN NOT NULL DEFAULT false,
    "payToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "paymentProvider" TEXT,
    "paidAt" TIMESTAMP(6),
    "productId" UUID,
    "expiresAt" TIMESTAMP(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seller_waId_key" ON "Seller"("waId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_payToken_key" ON "Submission"("payToken");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_productId_key" ON "Submission"("productId");

-- CreateIndex
CREATE INDEX "Submission_sellerId_status_idx" ON "Submission"("sellerId", "status");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
