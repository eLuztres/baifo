-- CreateTable
CREATE TABLE "FailedSignIn" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedSignIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FailedSignIn_email_ip_createdAt_idx" ON "FailedSignIn"("email", "ip", "createdAt");
