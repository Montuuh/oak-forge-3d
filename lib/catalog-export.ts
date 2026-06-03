import type { PrismaClient } from "@prisma/client";
import { CATALOG_PLACEHOLDER_IMAGE_PATH, isValidStoredImagePath } from "@/lib/catalog-image";
import { db } from "@/lib/db";
import type { Product, ProductsData } from "@/types/product";

type ProductWithImages = Awaited<
    ReturnType<PrismaClient["product"]["findMany"]>
>[number] & {
    images: { id: string; imagePath: string; status: string; origin: string }[];
};

function formatPrintTime(seconds: number | null, fallback: string | null): string {
    if (fallback) return fallback;
    if (!seconds) return "0:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function resolvePrimaryImagePath(row: {
    primaryImageId: string | null;
    images: { id: string; imagePath: string; status: string }[];
}): string {
    if (row.primaryImageId) {
        const primary = row.images.find((img) => img.id === row.primaryImageId);
        if (primary && isValidStoredImagePath(primary.imagePath)) {
            return primary.imagePath;
        }
    }

    const approved = row.images.find(
        (img) => img.status === "approved" && isValidStoredImagePath(img.imagePath),
    );
    if (approved) {
        return approved.imagePath;
    }

    return CATALOG_PLACEHOLDER_IMAGE_PATH;
}

export function mapProductRowToCatalogProduct(row: ProductWithImages): Product {
    const category = row.category === "standard" ? "standard" : "character";
    const n3dSlug = row.n3dSlug ?? row.slug;
    const imagePath = resolvePrimaryImagePath(row);
    const primary = row.primaryImageId
        ? row.images.find((img) => img.id === row.primaryImageId)
        : undefined;

    const product: Product = {
        id: row.slug,
        slug: row.slug,
        name: row.name,
        category,
        tags: row.tags,
        print_time: formatPrintTime(row.printTimeSeconds, row.printTime),
        print_time_seconds: row.printTimeSeconds ?? 0,
        weight_grams: row.weightGrams ?? 0,
        pokemon_name: row.pokemonName ?? undefined,
        pokedex_number: row.pokedexNumber ?? undefined,
        pokemon_types: row.pokemonTypes.length ? row.pokemonTypes : undefined,
        image_path: imagePath,
        n3d_url: `https://n3dmelbourne.com/designs/${n3dSlug}`,
        custom_description: row.shortDescription ?? undefined,
        price: row.priceCents != null ? row.priceCents / 100 : undefined,
        featured: row.featured,
        available: row.available,
        visible_in_catalog: true,
        last_synced: row.updatedAt.toISOString(),
    };

    if (primary?.status === "approved") {
        if (primary.origin === "ai_generated") {
            product.image_source = "ai-generated";
            product.ai_asset = {
                status: "approved",
                approved_image_path: primary.imagePath,
            };
        } else if (primary.origin === "real_photo") {
            product.image_source = "n3d-local";
        }
    }

    return product;
}

export async function fetchVisibleCatalogProductsFromDb(): Promise<Product[]> {
    const rows = await db.product.findMany({
        where: { isVisibleInCatalog: true },
        include: {
            images: {
                orderBy: { updatedAt: "desc" },
            },
        },
        orderBy: { name: "asc" },
    });

    return rows.map(mapProductRowToCatalogProduct);
}

export async function buildPublicCatalogData(): Promise<ProductsData> {
    const products = await fetchVisibleCatalogProductsFromDb();
    return {
        version: "1.0.0",
        last_updated: new Date().toISOString(),
        total_products: products.length,
        products,
    };
}
