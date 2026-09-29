/*
  Warnings:

  - You are about to drop the column `ProductImageIndex` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "ProductImageIndex",
ADD COLUMN     "imageIndex" INTEGER NOT NULL DEFAULT 0;
