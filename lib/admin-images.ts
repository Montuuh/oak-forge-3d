import { getAdminReviewerName } from "@/lib/admin-reviewer";
import { revalidatePath } from "next/cache";
import {
    buildLifestyleImagePrompt,
    getDefaultPromptVersion,
    pickCameraYawForPromptVersion,
    resolvePromptVersion,
} from "@/lib/ai-image-prompt";
import { db } from "@/lib/db";
import { generateLifestyleImageForAdmin } from "@/lib/lifestyle-image-generation";
import { isValidStoredImagePath } from "@/lib/catalog-image";
import { loadGenerationImageInputs } from "@/lib/ai-image-inputs";
import { mergeStudioSceneIntoInputs } from "@/lib/studio-scene-reference";
import { summarizeReferenceInputs } from "@/lib/gemini-image-parts";
import { fetchRemoteImage } from "@/lib/safe-remote-image-fetch";
import { collectLocalImageSources } from "@/lib/admin-local-images";
import {
    deleteStoredProductImage,
    isManualUploadImagePath,
    isN3dProtectedImagePath,
    putAiImage,
    putUploadImage,
} from "@/lib/product-image-storage";
import { isAiGeneratedStoragePath } from "@/lib/product-image-path";
const MAX_CANDIDATES = 5;
const MAX_LOCAL_IMAGES = 12;
const MAX_LOCAL_UPLOAD_BYTES = 8 * 1024 * 1024;

export class CandidateLimitError extends Error {
    constructor() {
        super(`Maximo ${MAX_CANDIDATES} candidatos por producto.`);
        this.name = "CandidateLimitError";
    }
}

export class N3dProtectedImageError extends Error {
    constructor() {
        super("Las imagenes N3D (render sync) no se pueden eliminar.");
        this.name = "N3dProtectedImageError";
    }
}

export async function ensureRealPhotoRecordsForProduct(productId: string, slug: string): Promise<void> {
    await db.productImage.updateMany({
        where: { productId, origin: "ai_generated" },
        data: { useAsReference: false },
    });

    const staleReferences = await db.productImage.findMany({
        where: { productId, origin: "real_photo" },
        select: { id: true, imagePath: true },
    });
    const staleIds = staleReferences
        .filter((row) => isAiGeneratedStoragePath(slug, row.imagePath))
        .map((row) => row.id);
    if (staleIds.length > 0) {
        await db.productImage.deleteMany({ where: { id: { in: staleIds } } });
    }

    const sources = await collectLocalImageSources(slug);
    if (sources.length === 0) return;

    const existing = await db.productImage.findMany({
        where: { productId, origin: "real_photo" },
        select: { id: true, imagePath: true, useAsReference: true },
    });
    const byPath = new Map(existing.map((row) => [row.imagePath.trim(), row]));

    for (const source of sources) {
        if (isAiGeneratedStoragePath(slug, source.imagePath)) continue;
        const prior = byPath.get(source.imagePath);
        if (prior) continue;
        const created = await db.productImage.create({
            data: {
                productId,
                origin: "real_photo",
                status: "rejected",
                imagePath: source.imagePath,
                notes: source.notes,
                useAsReference: true,
            },
        });
        byPath.set(source.imagePath, {
            id: created.id,
            imagePath: source.imagePath,
            useAsReference: true,
        });
    }
}

export async function getProductWithImagesBySlug(slug: string) {
    const product = await db.product.findUnique({
        where: { slug },
        include: {
            images: { orderBy: { createdAt: "desc" } },
            filaments: { orderBy: { sortOrder: "asc" } },
        },
    });
    if (!product) {
        throw new Error(`Producto no encontrado en base de datos: "${slug}"`);
    }

    await ensureRealPhotoRecordsForProduct(product.id, product.slug);

    return db.product.findUniqueOrThrow({
        where: { slug },
        include: {
            images: { orderBy: { createdAt: "desc" } },
            filaments: { orderBy: { sortOrder: "asc" } },
        },
    });
}

export async function uploadLocalProductImage(
    productId: string,
    file: { buffer: Buffer; mimeType: string; size: number },
    options?: { notes?: string },
) {
    if (file.size > MAX_LOCAL_UPLOAD_BYTES) {
        throw new Error("La imagen supera el limite de 8 MB.");
    }
    if (!file.mimeType.startsWith("image/")) {
        throw new Error("Solo se permiten archivos de imagen.");
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
        throw new Error("Producto no encontrado.");
    }

    const localCount = await db.productImage.count({
        where: { productId, origin: "real_photo" },
    });
    if (localCount >= MAX_LOCAL_IMAGES) {
        throw new Error(`Maximo ${MAX_LOCAL_IMAGES} imagenes locales por producto.`);
    }

    const imageRow = await db.productImage.create({
        data: {
            productId: product.id,
            origin: "real_photo",
            status: "rejected",
            imagePath: "pending",
            notes: options?.notes?.trim() || "Subida manual",
            useAsReference: true,
        },
    });

    try {
        const publicUrl = await putUploadImage(
            product.slug,
            imageRow.id,
            file.buffer,
            file.mimeType,
        );
        return db.productImage.update({
            where: { id: imageRow.id },
            data: { imagePath: publicUrl, useAsReference: true },
        });
    } catch (error) {
        await db.productImage.delete({ where: { id: imageRow.id } });
        throw error;
    }
}

export async function importLocalProductImageFromUrl(
    productId: string,
    imageUrl: string,
    meta?: { title?: string; sourcePage?: string },
) {
    const file = await fetchRemoteImage(imageUrl);

    const title = meta?.title?.trim();
    const sourceHost = meta?.sourcePage ? tryHost(meta.sourcePage) : tryHost(imageUrl);
    const notes = title
        ? `Busqueda web: ${truncate(title, 80)}${sourceHost ? ` (${sourceHost})` : ""}`
        : sourceHost
          ? `Busqueda web (${sourceHost})`
          : "Busqueda web";

    return uploadLocalProductImage(productId, file, { notes });
}

function tryHost(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

function truncate(value: string, max: number): string {
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
}

export async function generateCandidateForProduct(
    productId: string,
    requestedPromptVersion?: string | null,
) {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
        throw new Error("Producto no encontrado.");
    }

    const existing = await db.productImage.findMany({
        where: {
            productId,
            status: { in: ["candidate", "approved"] },
            origin: "ai_generated",
        },
    });
    const candidateCount = existing.filter((row) => isValidStoredImagePath(row.imagePath)).length;

    if (candidateCount >= MAX_CANDIDATES) {
        throw new CandidateLimitError();
    }

    const promptVersion = resolvePromptVersion(requestedPromptVersion);

    await ensureRealPhotoRecordsForProduct(product.id, product.slug);

    const productImages = await db.productImage.findMany({ where: { productId: product.id } });
    const markedRefs = productImages.filter(
        (img) =>
            img.origin === "real_photo" &&
            img.useAsReference &&
            isValidStoredImagePath(img.imagePath),
    );
    const baseInputs = await loadGenerationImageInputs(product.slug, productImages);
    const inputs = await mergeStudioSceneIntoInputs(baseInputs, promptVersion);

    if (markedRefs.length === 0) {
        throw new Error(
            "Marca al menos una imagen local/N3D con «Usar como referencia» antes de generar.",
        );
    }
    if (inputs.references.length === 0) {
        const paths = markedRefs.map((img) => img.imagePath).join(", ");
        throw new Error(
            `Hay referencias marcadas pero no se encontraron los archivos en disco: ${paths}. ` +
                "Comprueba que las URLs de referencia en Supabase Storage sean accesibles.",
        );
    }

    const cameraYaw = pickCameraYawForPromptVersion(promptVersion);
    const prompt = buildLifestyleImagePrompt(
        {
            name: product.name,
            category: product.category,
            slug: product.slug,
            pokemonName: product.pokemonName,
            pokemonTypes: product.pokemonTypes,
            pokedexNumber: product.pokedexNumber,
        },
        inputs,
        { cameraYawDegrees: cameraYaw, promptVersion },
    );

    const generated = await generateLifestyleImageForAdmin(prompt, inputs, { promptVersion });
    const imageRow = await db.productImage.create({
        data: {
            productId: product.id,
            status: "candidate",
            origin: "ai_generated",
            imagePath: "pending",
            promptVersion,
            promptText: prompt,
            sourceModel: generated.model,
            useAsReference: false,
            notes: `Refs: ${summarizeReferenceInputs(inputs)} · yaw ${cameraYaw}°`,
        },
    });

    try {
        const publicUrl = await putAiImage(
            product.slug,
            imageRow.id,
            generated.buffer,
            generated.contentType,
        );

        return db.productImage.update({
            where: { id: imageRow.id },
            data: { imagePath: publicUrl },
        });
    } catch (error) {
        await db.productImage.delete({ where: { id: imageRow.id } });
        throw error;
    }
}

export async function deleteProductImage(imageId: string) {
    const image = await db.productImage.findUnique({
        where: { id: imageId },
        include: { product: true },
    });

    if (!image) {
        throw new Error("Imagen no encontrada.");
    }

    if (
        image.origin === "real_photo" &&
        isN3dProtectedImagePath(image.product.slug, image.imagePath)
    ) {
        throw new N3dProtectedImageError();
    }

    let storageDeleted = false;
    if (isValidStoredImagePath(image.imagePath)) {
        try {
            if (image.origin === "ai_generated" || isManualUploadImagePath(image.product.slug, image.imagePath)) {
                await deleteStoredProductImage(image.imagePath, image.product.slug);
                storageDeleted = true;
            }
        } catch (error) {
            if (error instanceof N3dProtectedImageError) throw error;
            const detail = error instanceof Error ? error.message : String(error);
            throw new Error(`No se pudo borrar el archivo: ${detail}`);
        }
    }

    const wasPrimary = image.product.primaryImageId === imageId;
    const wasApproved = image.status === "approved";

    await db.$transaction(async (tx) => {
        if (wasPrimary) {
            const fallback = await tx.productImage.findFirst({
                where: {
                    productId: image.productId,
                    status: "approved",
                    id: { not: imageId },
                    imagePath: { not: "pending" },
                },
                orderBy: { updatedAt: "desc" },
            });
            await tx.product.update({
                where: { id: image.productId },
                data: { primaryImageId: fallback?.id ?? null },
            });
        }

        await tx.productImage.delete({ where: { id: imageId } });
    });

    return {
        deletedId: imageId,
        productSlug: image.product.slug,
        storageDeleted,
    };
}

export async function approveProductImage(imageId: string) {
    const reviewer = getAdminReviewerName();
    const image = await db.productImage.findUnique({
        where: { id: imageId },
        include: { product: true },
    });

    if (!image) {
        throw new Error("Imagen no encontrada.");
    }
    if (!isValidStoredImagePath(image.imagePath)) {
        throw new Error("Esta imagen esta incompleta (registro pendiente). Eliminala y vuelve a generar.");
    }

    const now = new Date();

    await db.$transaction(async (tx) => {
        await tx.productImage.updateMany({
            where: {
                productId: image.productId,
                status: "approved",
                id: { not: imageId },
            },
            data: {
                status: "rejected",
                reviewedBy: reviewer,
                reviewedAt: now,
            },
        });

        await tx.productImage.update({
            where: { id: imageId },
            data: {
                status: "approved",
                reviewedBy: reviewer,
                reviewedAt: now,
            },
        });

        await tx.product.update({
            where: { id: image.productId },
            data: { primaryImageId: imageId },
        });
    });

    if (image.product.isVisibleInCatalog) {
        revalidatePath("/");
        revalidatePath(`/products/${image.product.slug}`);
    }

    return db.productImage.findUnique({
        where: { id: imageId },
        include: { product: true },
    });
}

export async function rejectProductImage(imageId: string, notes?: string) {
    const reviewer = getAdminReviewerName();
    const image = await db.productImage.findUnique({
        where: { id: imageId },
        include: { product: true },
    });

    if (!image) {
        throw new Error("Imagen no encontrada.");
    }

    const now = new Date();

    await db.productImage.update({
        where: { id: imageId },
        data: {
            status: "rejected",
            reviewedBy: reviewer,
            reviewedAt: now,
            notes: notes?.trim() || image.notes,
        },
    });

    const product = await db.product.findUnique({
        where: { id: image.productId },
        select: { primaryImageId: true },
    });

    if (product?.primaryImageId === imageId) {
        const fallback = await db.productImage.findFirst({
            where: { productId: image.productId, status: "approved" },
            orderBy: { updatedAt: "desc" },
        });
        await db.product.update({
            where: { id: image.productId },
            data: { primaryImageId: fallback?.id ?? null },
        });
    }

    return db.productImage.findUnique({ where: { id: imageId } });
}

export async function setProductImageUseAsReference(imageId: string, useAsReference: boolean) {
    const image = await db.productImage.findUnique({
        where: { id: imageId },
        include: { product: true },
    });

    if (!image) {
        throw new Error("Imagen no encontrada.");
    }
    if (image.origin !== "real_photo") {
        throw new Error("Solo las imagenes locales o N3D pueden usarse como referencia.");
    }
    if (!isValidStoredImagePath(image.imagePath)) {
        throw new Error("La imagen aun no tiene archivo valido.");
    }

    return db.productImage.update({
        where: { id: imageId },
        data: { useAsReference },
    });
}
