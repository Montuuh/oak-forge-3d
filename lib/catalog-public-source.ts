import type { Product, ProductsData } from "@/types/product";

export type CatalogSourceMode = "auto" | "db";

function resolveCatalogSource(): CatalogSourceMode {
    const value = process.env.CATALOG_SOURCE?.trim().toLowerCase();
    if (value === "db") return "db";
    if (value === "json") {
        console.warn(
            "[catalog] CATALOG_SOURCE=json ya no esta soportado; usando Postgres (DATABASE_URL).",
        );
    }
    return "auto";
}

export function filterVisibleCatalogProducts(products: Product[]): Product[] {
    return products.filter((product) => product.visible_in_catalog !== false);
}

/** Server-only: catalogo publico desde Postgres. */
export async function getPublicCatalogData(): Promise<ProductsData> {
    resolveCatalogSource();

    if (!process.env.DATABASE_URL?.trim()) {
        throw new Error(
            "DATABASE_URL es obligatorio para el catalogo publico. Configuralo en .env.local o Vercel.",
        );
    }

    const { buildPublicCatalogData } = await import("@/lib/catalog-export");
    return await buildPublicCatalogData();
}
