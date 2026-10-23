-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "alertEmails" TEXT NOT NULL DEFAULT '',
    "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "whatsappNumber" TEXT NOT NULL DEFAULT '',
    "whatsappApiKey" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);
