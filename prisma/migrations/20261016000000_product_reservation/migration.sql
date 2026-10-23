-- AlterTable
ALTER TABLE "Product" ADD COLUMN "reservedUntil" TIMESTAMP(6),
ADD COLUMN "reservedById" UUID;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
