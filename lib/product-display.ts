import { CATALOG_PLACEHOLDER_IMAGE_PATH, hasCatalogImage } from "@/lib/catalog-image";
import type { Product } from "@/types/product";

export function formatPrintTime(time: string): string {
    const parts = time.split(":");
    if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
    return time;
}

export function formatWeight(grams: number): string {
    if (grams >= 1000) {
        return `${(grams / 1000).toFixed(1)}kg`;
    }
    return `${Math.round(grams)}g`;
}

export function resolveProductImagePath(product: Product): string {
    if (hasCatalogImage(product.image_path)) {
        return product.image_path;
    }
    if (product.ai_asset?.status === "approved" && product.ai_asset.approved_image_path) {
        return product.ai_asset.approved_image_path;
    }
    return CATALOG_PLACEHOLDER_IMAGE_PATH;
}

export { hasCatalogImage, CATALOG_PLACEHOLDER_IMAGE_PATH };
