import type { Product, ProductImage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { replaceProductFilaments, mapDbFilamentsToLines } from "@/lib/product-filaments";
import {
    assertProductSlugAvailable,
    normalizeProductSlug,
    suggestDuplicateSlug,
    validateProductSlug,
} from "@/lib/admin-product-slug";
import { db } from "@/lib/db";
import {
    isN3dProtectedImagePath,
    isAiGeneratedStoragePath,
    isManualUploadImagePath,
    putAiImage,
    putN3dRender,
    putUploadImage,
} from "@/lib/product-image-storage";
import { ensureRealPhotoRecordsForProduct } from "@/lib/admin-images";

export type AdminProductCreateInput = {
    slug: string;
    name: string;
    category: string;
    n3dSlug?: string | null;
};

function revalidateProductPaths(slug: string): void {
    revalidatePath("/");
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${slug}`);
    revalidatePath(`/products/${slug}`);
}

export async function createAdminProduct(input: AdminProductCreateInput): Promise<Product> {
    const slug = normalizeProductSlug(input.slug);
    validateProductSlug(slug);
    await assertProductSlugAvailable(slug);

    const name = input.name.trim();
    if (!name) {
        throw new Error("El nombre es obligatorio.");
    }

    const category = input.category.trim() || "character";
    const n3dSlug = input.n3dSlug?.trim() || null;

    const product = await db.product.create({
        data: {
            slug,
            name,
            category,
            n3dSlug,
            status: "draft",
            isVisibleInCatalog: false,
            featured: false,
            available: true,
            tags: [],
            pokemonTypes: [],
        },
    });

    revalidateProductPaths(product.slug);
    return product;
}

async function downloadImageBuffer(imagePath: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const response = await fetch(imagePath, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`No se pudo descargar la imagen (${response.status}).`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/webp";
    return { buffer, mimeType };
}

async function copyProductImageToSlug(
    sourceSlug: string,
    targetSlug: string,
    image: Pick<ProductImage, "id" | "imagePath" | "origin" | "status" | "promptVersion" | "promptText" | "sourceModel" | "notes" | "useAsReference">,
): Promise<string> {
    const { buffer, mimeType } = await downloadImageBuffer(image.imagePath);

    if (isN3dProtectedImagePath(sourceSlug, image.imagePath)) {
        return putN3dRender(targetSlug, buffer, mimeType);
    }
    if (isAiGeneratedStoragePath(sourceSlug, image.imagePath)) {
        const newId = randomUUID();
        return putAiImage(targetSlug, newId, buffer, mimeType);
    }
    if (isManualUploadImagePath(sourceSlug, image.imagePath)) {
        const newId = randomUUID();
        return putUploadImage(targetSlug, newId, buffer, mimeType);
    }

    const newId = randomUUID();
    return putUploadImage(targetSlug, newId, buffer, mimeType);
}

export type DuplicateAdminProductOptions = {
    sourceProductId: string;
    newSlug?: string;
    copyImages?: boolean;
};

export async function duplicateAdminProduct(
    options: DuplicateAdminProductOptions,
): Promise<Product> {
    const source = await db.product.findUnique({
        where: { id: options.sourceProductId },
        include: {
            filaments: { orderBy: { sortOrder: "asc" } },
            images: { orderBy: { createdAt: "asc" } },
        },
    });
    if (!source) {
        throw new Error("Producto origen no encontrado.");
    }

    const slug = normalizeProductSlug(
        options.newSlug?.trim() || (await suggestDuplicateSlug(source.slug)),
    );
    validateProductSlug(slug);
    await assertProductSlugAvailable(slug);

    const copyImages = options.copyImages !== false;

    const product = await db.product.create({
        data: {
            slug,
            name: `${source.name} (copia)`,
            category: source.category,
            n3dSlug: null,
            status: "draft",
            isVisibleInCatalog: false,
            shortDescription: source.shortDescription,
            longDescription: source.longDescription,
            priceCents: source.priceCents,
            printTime: source.printTime,
            printTimeSeconds: source.printTimeSeconds,
            weightGrams: source.weightGrams,
            pokemonName: source.pokemonName,
            pokedexNumber: source.pokedexNumber,
            pokemonTypes: source.pokemonTypes,
            tags: [...source.tags],
            featured: false,
            available: source.available,
        },
    });

    await replaceProductFilaments(product.id, mapDbFilamentsToLines(source.filaments));

    if (copyImages && source.images.length > 0) {
        for (const image of source.images) {
            try {
                const newPath = await copyProductImageToSlug(source.slug, product.slug, image);
                await db.productImage.create({
                    data: {
                        productId: product.id,
                        origin: image.origin,
                        status: image.origin === "ai_generated" ? "candidate" : image.status,
                        imagePath: newPath,
                        promptVersion: image.promptVersion,
                        promptText: image.promptText,
                        sourceModel: image.sourceModel,
                        notes: image.notes,
                        useAsReference: image.useAsReference,
                    },
                });
            } catch (err) {
                console.warn(
                    `Duplicar imagen omitida (${image.id}):`,
                    err instanceof Error ? err.message : err,
                );
            }
        }
        await ensureRealPhotoRecordsForProduct(product.id, product.slug);
    }

    revalidateProductPaths(product.slug);
    revalidateProductPaths(source.slug);
    return product;
}

export async function archiveAdminProduct(productId: string): Promise<Product> {
    const existing = await db.product.findUnique({
        where: { id: productId },
        select: { id: true, slug: true },
    });
    if (!existing) {
        throw new Error("Producto no encontrado.");
    }

    const product = await db.product.update({
        where: { id: productId },
        data: {
            status: "archived",
            isVisibleInCatalog: false,
            featured: false,
        },
    });

    revalidateProductPaths(existing.slug);
    return product;
}

export async function unarchiveAdminProduct(productId: string): Promise<Product> {
    const existing = await db.product.findUnique({
        where: { id: productId },
        select: { id: true, slug: true, status: true },
    });
    if (!existing) {
        throw new Error("Producto no encontrado.");
    }
    if (existing.status !== "archived") {
        throw new Error("El producto no esta archivado.");
    }

    const product = await db.product.update({
        where: { id: productId },
        data: { status: "draft" },
    });

    revalidateProductPaths(existing.slug);
    return product;
}
