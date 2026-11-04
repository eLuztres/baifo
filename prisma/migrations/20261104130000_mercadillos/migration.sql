-- A Mercadillo: one seller or shop offering several listings together.
CREATE TABLE "Mercadillo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "text" JSONB NOT NULL DEFAULT '{}',
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mercadillo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Mercadillo_slug_key" ON "Mercadillo"("slug");

ALTER TABLE "Product" ADD COLUMN "mercadilloId" UUID;
ALTER TABLE "Submission" ADD COLUMN "mercadilloId" UUID;

ALTER TABLE "Product" ADD CONSTRAINT "Product_mercadilloId_fkey" FOREIGN KEY ("mercadilloId") REFERENCES "Mercadillo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_mercadilloId_fkey" FOREIGN KEY ("mercadilloId") REFERENCES "Mercadillo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
