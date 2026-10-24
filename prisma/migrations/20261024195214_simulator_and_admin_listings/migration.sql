-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "createdByAdmin" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "payToken" SET DEFAULT gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "SimulatedMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "waId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "buttons" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulatedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SimulatedMessage_waId_createdAt_idx" ON "SimulatedMessage"("waId", "createdAt");
