-- A listing can be in several Mercadillos: the one-Mercadillo columns become link tables, keeping today's links.

-- CreateTable
CREATE TABLE "_MercadilloToProduct" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_MercadilloToProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MercadilloToSubmission" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_MercadilloToSubmission_AB_pkey" PRIMARY KEY ("A","B")
);

-- Today's links
INSERT INTO "_MercadilloToProduct" ("A", "B") SELECT "mercadilloId", "id" FROM "Product" WHERE "mercadilloId" IS NOT NULL;
INSERT INTO "_MercadilloToSubmission" ("A", "B") SELECT "mercadilloId", "id" FROM "Submission" WHERE "mercadilloId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "_MercadilloToProduct_B_index" ON "_MercadilloToProduct"("B");

-- CreateIndex
CREATE INDEX "_MercadilloToSubmission_B_index" ON "_MercadilloToSubmission"("B");

-- AddForeignKey
ALTER TABLE "_MercadilloToProduct" ADD CONSTRAINT "_MercadilloToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Mercadillo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MercadilloToProduct" ADD CONSTRAINT "_MercadilloToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MercadilloToSubmission" ADD CONSTRAINT "_MercadilloToSubmission_A_fkey" FOREIGN KEY ("A") REFERENCES "Mercadillo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MercadilloToSubmission" ADD CONSTRAINT "_MercadilloToSubmission_B_fkey" FOREIGN KEY ("B") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_mercadilloId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_mercadilloId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "mercadilloId";

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "mercadilloId";
