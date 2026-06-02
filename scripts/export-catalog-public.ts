import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { Product, ProductsData } from "../types/product";

const OUTPUT_PATH = path.join(process.cwd(), "data", "catalog-public.json");
dotenv.config({ path: ".env.local" });
dotenv.config();

function getDatabaseUrl(): string {
    const value = process.env.DATABASE_URL;
    if (!value) {
        throw new Error("DATABASE_URL is required.");
    }
    return value;
}

function formatPrintTime(seconds: number | null, fallback: string | null): string {
    if (fallback) return fallback;
    if (!seconds) return "0:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function mapProduct(
    row: Awaited<ReturnType<PrismaClient["product"]["findMany"]>>[number] & {
        images: { imagePath: string; status: string }[];
    },
): Product | null {
    const approved = row.images.find((img) => img.status === "approved");
    if (!approved) {
        console.warn(`Skipping ${row.slug}: visible in catalog but no approved image.`);
        return null;
    }

    const category = row.category === "standard" ? "standard" : "character";
    const n3dSlug = row.n3dSlug ?? row.slug;

    return {
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
        image_path: approved.imagePath,
        image_source: "ai-generated",
        ai_asset: {
            status: "approved",
            approved_image_path: approved.imagePath,
        },
        n3d_url: `https://n3dmelbourne.com/designs/${n3dSlug}`,
        custom_description: row.shortDescription ?? undefined,
        price: row.priceCents != null ? row.priceCents / 100 : undefined,
        featured: row.featured,
        available: row.available,
        visible_in_catalog: true,
        last_synced: row.updatedAt.toISOString(),
    };
}

async function main() {
    const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
    const prisma = new PrismaClient({ adapter });

    try {
        const rows = await prisma.product.findMany({
            where: { isVisibleInCatalog: true },
            include: {
                images: {
                    where: { status: "approved" },
                    orderBy: { updatedAt: "desc" },
                },
            },
            orderBy: { name: "asc" },
        });

        const products = rows
            .map(mapProduct)
            .filter((product): product is Product => product !== null);

        const payload: ProductsData = {
            version: "1.0.0",
            last_updated: new Date().toISOString(),
            total_products: products.length,
            products,
        };

        fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
        console.log(
            `Exported ${products.length} product(s) to catalog-public.json (${rows.length - products.length} skipped).`,
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
