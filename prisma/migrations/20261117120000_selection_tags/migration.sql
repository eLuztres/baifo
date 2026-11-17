-- A selección (Mercadillo) can hold etiquetas: every listing with one of them is in it too.

-- CreateTable
CREATE TABLE "_MercadilloToTag" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_MercadilloToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MercadilloToTag_B_index" ON "_MercadilloToTag"("B");

-- AddForeignKey
ALTER TABLE "_MercadilloToTag" ADD CONSTRAINT "_MercadilloToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Mercadillo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MercadilloToTag" ADD CONSTRAINT "_MercadilloToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
