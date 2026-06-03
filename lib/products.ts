/**
 * Public catalog data access layer.
 * Reads from data/catalog-public.json (exported from admin DB).
 */

import { CATALOG_PLACEHOLDER_IMAGE_PATH, hasCatalogImage } from '@/lib/catalog-image';
import { Product, ProductsData, ProductCategory } from '@/types/product';
import catalogData from '@/data/catalog-public.json';

const data = catalogData as ProductsData;

function isVisibleInCatalog(product: Product): boolean {
    return product.visible_in_catalog !== false;
}

function getCatalogProducts(): Product[] {
    return data.products.filter(isVisibleInCatalog);
}

/**
 * Get all products visible on the public catalog
 */
export function getAllProducts(): Product[] {
    return getCatalogProducts();
}

/**
 * Get products filtered by category
 */
export function getProductsByCategory(category: ProductCategory): Product[] {
    const products = getCatalogProducts();
    if (category === 'all') {
        return products;
    }
    return products.filter(p => p.category === category);
}

/**
 * Get a single product by slug
 */
export function getProductBySlug(slug: string): Product | undefined {
    return getCatalogProducts().find(p => p.slug === slug);
}

/**
 * Get all product slugs (for static generation)
 */
export function getAllProductSlugs(): string[] {
    return getCatalogProducts().map(p => p.slug);
}

/**
 * Get featured products
 */
export function getFeaturedProducts(): Product[] {
    return getCatalogProducts().filter(p => p.featured === true);
}

/**
 * Get available products only
 */
export function getAvailableProducts(): Product[] {
    return getCatalogProducts().filter(p => p.available !== false);
}

/**
 * Get catalog metadata
 */
export function getCatalogInfo(): {
    version: string;
    lastUpdated: string;
    totalProducts: number;
} {
    const products = getCatalogProducts();
    return {
        version: data.version,
        lastUpdated: data.last_updated,
        totalProducts: products.length,
    };
}

/**
 * Format print time for display
 */
export function formatPrintTime(time: string): string {
    const parts = time.split(':');
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

/**
 * Format weight for display
 */
export function formatWeight(grams: number): string {
    if (grams >= 1000) {
        return `${(grams / 1000).toFixed(1)}kg`;
    }
    return `${Math.round(grams)}g`;
}

/**
 * Ruta de imagen para el catalogo publico (primary o placeholder PND).
 */
export function resolveProductImagePath(product: Product): string {
    if (hasCatalogImage(product.image_path)) {
        return product.image_path;
    }
    if (product.ai_asset?.status === 'approved' && product.ai_asset.approved_image_path) {
        return product.ai_asset.approved_image_path;
    }
    return CATALOG_PLACEHOLDER_IMAGE_PATH;
}

export { hasCatalogImage, CATALOG_PLACEHOLDER_IMAGE_PATH };
