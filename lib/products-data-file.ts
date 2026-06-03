import * as fs from "fs";
import * as path from "path";
import type { Product, ProductsData } from "@/types/product";

const PRODUCTS_JSON_PATH = path.join(process.cwd(), "data", "products.json");

export function readProductsData(): ProductsData {
    const raw = fs.readFileSync(PRODUCTS_JSON_PATH, "utf-8");
    return JSON.parse(raw) as ProductsData;
}

export function writeProductsData(data: ProductsData): void {
    data.last_updated = new Date().toISOString();
    data.total_products = data.products.length;
    fs.writeFileSync(PRODUCTS_JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export function findProductBySlug(slug: string): Product {
    const data = readProductsData();
    const product = data.products.find((item) => item.slug === slug);
    if (!product) {
        throw new Error(`Producto no encontrado en products.json: "${slug}"`);
    }
    return product;
}

export function updateProductBySlug(
    slug: string,
    updater: (product: Product) => void,
): Product | null {
    const data = readProductsData();
    const product = data.products.find((item) => item.slug === slug);
    if (!product) {
        return null;
    }
    updater(product);
    writeProductsData(data);
    return product;
}
