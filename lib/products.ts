import "server-only";

import {
    filterVisibleCatalogProducts,
    getPublicCatalogData,
} from "@/lib/catalog-public-source";
import type { Product, ProductCategory } from "@/types/product";

export async function getAllProducts(): Promise<Product[]> {
    const data = await getPublicCatalogData();
    return filterVisibleCatalogProducts(data.products);
}

export async function getProductsByCategory(category: ProductCategory): Promise<Product[]> {
    const products = await getAllProducts();
    if (category === "all") {
        return products;
    }
    return products.filter((p) => p.category === category);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
    const products = await getAllProducts();
    return products.find((p) => p.slug === slug);
}

export async function getAllProductSlugs(): Promise<string[]> {
    const products = await getAllProducts();
    return products.map((p) => p.slug);
}

export async function getFeaturedProducts(): Promise<Product[]> {
    const products = await getAllProducts();
    return products.filter((p) => p.featured === true);
}

export async function getAvailableProducts(): Promise<Product[]> {
    const products = await getAllProducts();
    return products.filter((p) => p.available !== false);
}

export async function getCatalogInfo(): Promise<{
    version: string;
    lastUpdated: string;
    totalProducts: number;
}> {
    const data = await getPublicCatalogData();
    const products = filterVisibleCatalogProducts(data.products);
    return {
        version: data.version,
        lastUpdated: data.last_updated,
        totalProducts: products.length,
    };
}
