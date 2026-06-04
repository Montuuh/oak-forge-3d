-- Filamentos por producto (inventario / sync N3D)
CREATE TABLE "product_filaments" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "n3dFilamentId" INTEGER,
    "color" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "weightGrams" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_filaments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_filaments_productId_idx" ON "product_filaments"("productId");

ALTER TABLE "product_filaments" ADD CONSTRAINT "product_filaments_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
