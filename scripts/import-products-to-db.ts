import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ProductStatus } from "@prisma/client";
import type { Product, ProductsData } from "../types/product";

const PRODUCTS_JSON_PATH = path.join(process.cwd(), "data", "products.json");
dotenv.config({ path: ".env.local" });
dotenv.config();

function getDatabaseUrl(): string {
    const value = process.env.DATABASE_URL;
    if (!value) {
        throw new Error("DATABASE_URL is required.");
    }
    return value;
}

function readProducts(): Product[] {
    const raw = fs.readFileSync(PRODUCTS_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw) as ProductsData;
    return parsed.products;
}

function inferStatus(product: Product): ProductStatus {
    if (product.available === false) return "archived";
    return "draft";
}

async function main() {
    const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
    const prisma = new PrismaClient({ adapter });

    try {
        const products = readProducts();
        let upserted = 0;

        for (const product of products) {
            await prisma.product.upsert({
                where: { slug: product.slug },
                update: {
                    name: product.name,
                    n3dSlug: product.slug,
                    category: product.category,
                    status: inferStatus(product),
                    isVisibleInCatalog: false,
                    shortDescription: product.custom_description ?? product.pokemon_description ?? null,
                    priceCents: product.price ? Math.round(product.price * 100) : null,
                    printTime: product.print_time,
                    printTimeSeconds: product.print_time_seconds || null,
                    weightGrams: product.weight_grams,
                    pokemonName: product.pokemon_name ?? null,
                    pokedexNumber: product.pokedex_number ?? null,
                    pokemonTypes: product.pokemon_types ?? [],
                    tags: product.tags ?? [],
                    featured: product.featured ?? false,
                    available: product.available ?? true,
                },
                create: {
                    slug: product.slug,
                    n3dSlug: product.slug,
                    name: product.name,
                    category: product.category,
                    status: inferStatus(product),
                    isVisibleInCatalog: false,
                    shortDescription: product.custom_description ?? product.pokemon_description ?? null,
                    priceCents: product.price ? Math.round(product.price * 100) : null,
                    printTime: product.print_time,
                    printTimeSeconds: product.print_time_seconds || null,
                    weightGrams: product.weight_grams,
                    pokemonName: product.pokemon_name ?? null,
                    pokedexNumber: product.pokedex_number ?? null,
                    pokemonTypes: product.pokemon_types ?? [],
                    tags: product.tags ?? [],
                    featured: product.featured ?? false,
                    available: product.available ?? true,
                },
            });
            upserted++;
        }

        console.log(`Imported/updated ${upserted} products into database.`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
