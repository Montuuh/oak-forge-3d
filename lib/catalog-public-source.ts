import catalogJson from "@/data/catalog-public.json";
import type { Product, ProductsData } from "@/types/product";

export type CatalogSourceMode = "auto" | "db" | "json";

function resolveCatalogSource(): CatalogSourceMode {
    const value = process.env.CATALOG_SOURCE?.trim().toLowerCase();
    if (value === "db" || value === "json") return value;
    return "auto";
}

function loadCatalogFromJson(): ProductsData {
    return catalogJson as ProductsData;
}

export function filterVisibleCatalogProducts(products: Product[]): Product[] {
    return products.filter((product) => product.visible_in_catalog !== false);
}

/** Server-only: loads catalog from DB or JSON snapshot. */
export async function getPublicCatalogData(): Promise<ProductsData> {
    const mode = resolveCatalogSource();

    if (mode === "json") {
        return loadCatalogFromJson();
    }

    if (mode === "db" || (mode === "auto" && process.env.DATABASE_URL?.trim())) {
        try {
            const { buildPublicCatalogData } = await import("@/lib/catalog-export");
            return await buildPublicCatalogData();
        } catch (error) {
            if (mode === "db") throw error;
            console.error("[catalog] DB load failed, falling back to JSON:", error);
        }
    }

    return loadCatalogFromJson();
}
