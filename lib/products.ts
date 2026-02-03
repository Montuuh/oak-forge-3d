/**
 * Product data access layer
 * Reads from the local products.json file
 */

import { Product, ProductsData, ProductCategory } from '@/types/product';
import productsData from '@/data/products.json';

const data = productsData as ProductsData;

/**
 * Get all products
 */
export function getAllProducts(): Product[] {
    return data.products;
}

/**
 * Get products filtered by category
 */
export function getProductsByCategory(category: ProductCategory): Product[] {
    if (category === 'all') {
        return data.products;
    }
    return data.products.filter(p => p.category === category);
}

/**
 * Get a single product by slug
 */
export function getProductBySlug(slug: string): Product | undefined {
    return data.products.find(p => p.slug === slug);
}

/**
 * Get all product slugs (for static generation)
 */
export function getAllProductSlugs(): string[] {
    return data.products.map(p => p.slug);
}

/**
 * Get featured products
 */
export function getFeaturedProducts(): Product[] {
    return data.products.filter(p => p.featured === true);
}

/**
 * Get available products only
 */
export function getAvailableProducts(): Product[] {
    return data.products.filter(p => p.available !== false);
}

/**
 * Get catalog metadata
 */
export function getCatalogInfo(): {
    version: string;
    lastUpdated: string;
    totalProducts: number;
} {
    return {
        version: data.version,
        lastUpdated: data.last_updated,
        totalProducts: data.total_products,
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
