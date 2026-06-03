import { ProductStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { PRODUCT_STATUS_OPTIONS } from "@/lib/admin-product-constants";

export type AdminProductUpdateInput = {
    id: string;
    name: string;
    category: string;
    status: ProductStatus;
    n3dSlug: string | null;
    shortDescription: string | null;
    longDescription: string | null;
    priceCents: number | null;
    printTime: string | null;
    printTimeSeconds: number | null;
    weightGrams: number | null;
    pokemonName: string | null;
    pokedexNumber: number | null;
    pokemonTypes: string[];
    tags: string[];
    featured: boolean;
    available: boolean;
    isVisibleInCatalog: boolean;
};

function splitList(raw: string): string[] {
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

export function parseProductFormData(formData: FormData): AdminProductUpdateInput {
    const id = String(formData.get("id") || "");
    const status = String(formData.get("status") || "draft") as ProductStatus;
    const priceRaw = String(formData.get("priceCents") || "").trim();
    const printSecondsRaw = String(formData.get("printTimeSeconds") || "").trim();
    const weightRaw = String(formData.get("weightGrams") || "").trim();
    const pokedexRaw = String(formData.get("pokedexNumber") || "").trim();

    if (!PRODUCT_STATUS_OPTIONS.includes(status)) {
        throw new Error("Estado de producto invalido.");
    }

    return {
        id,
        name: String(formData.get("name") || "").trim(),
        category: String(formData.get("category") || "character").trim(),
        status,
        n3dSlug: String(formData.get("n3dSlug") || "").trim() || null,
        shortDescription: String(formData.get("shortDescription") || "").trim() || null,
        longDescription: String(formData.get("longDescription") || "").trim() || null,
        priceCents: priceRaw ? Number(priceRaw) : null,
        printTime: String(formData.get("printTime") || "").trim() || null,
        printTimeSeconds: printSecondsRaw ? Number(printSecondsRaw) : null,
        weightGrams: weightRaw ? Number(weightRaw) : null,
        pokemonName: String(formData.get("pokemonName") || "").trim() || null,
        pokedexNumber: pokedexRaw ? Number(pokedexRaw) : null,
        pokemonTypes: splitList(String(formData.get("pokemonTypes") || "")),
        tags: splitList(String(formData.get("tags") || "")),
        featured: formData.get("featured") === "on",
        available: formData.get("available") === "on",
        isVisibleInCatalog: formData.get("isVisibleInCatalog") === "on",
    };
}

export async function updateAdminProduct(input: AdminProductUpdateInput): Promise<void> {
    if (!input.id) {
        throw new Error("ID de producto requerido.");
    }
    if (!input.name) {
        throw new Error("El nombre es obligatorio.");
    }

    const existing = await db.product.findUnique({
        where: { id: input.id },
        select: { slug: true },
    });
    if (!existing) {
        throw new Error("Producto no encontrado.");
    }

    await db.product.update({
        where: { id: input.id },
        data: {
            name: input.name,
            category: input.category,
            status: input.status,
            n3dSlug: input.n3dSlug,
            shortDescription: input.shortDescription,
            longDescription: input.longDescription,
            priceCents: input.priceCents,
            printTime: input.printTime,
            printTimeSeconds: input.printTimeSeconds,
            weightGrams: input.weightGrams,
            pokemonName: input.pokemonName,
            pokedexNumber: input.pokedexNumber,
            pokemonTypes: input.pokemonTypes,
            tags: input.tags,
            featured: input.featured,
            available: input.available,
            isVisibleInCatalog: input.isVisibleInCatalog,
        },
    });

    revalidatePath("/");
    revalidatePath(`/products/${existing.slug}`);
}
