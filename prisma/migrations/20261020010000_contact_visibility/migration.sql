-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN     "showEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showInstagram" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showPhone" BOOLEAN NOT NULL DEFAULT true;
