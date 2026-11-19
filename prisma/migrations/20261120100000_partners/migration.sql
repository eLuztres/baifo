-- CreateTable
CREATE TABLE "Partner" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "text" JSONB NOT NULL DEFAULT '{}',
    "icon" TEXT,
    "contactPhone" TEXT,
    "token" TEXT NOT NULL,
    "maxListings" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "partnerId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Partner_slug_key" ON "Partner"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_token_key" ON "Partner"("token");

-- CreateIndex
CREATE INDEX "Submission_partnerId_idx" ON "Submission"("partnerId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
