import { getAdminReviewerName } from "@/lib/admin-reviewer";
import { buildLifestyleImagePrompt, getDefaultPromptVersion, pickLifestyleCameraYawDegrees, resolvePromptVersion } from "@/lib/ai-image-prompt";
import {
    findQueueEntry,
    getPilotSlugs,
    readAiImageQueue,
    trySyncQueueRemoveCandidate,
    upsertQueueEntry,
} from "@/lib/ai-image-queue-file";
import type { QueueCandidate } from "@/lib/ai-image-queue-types";
import { db } from "@/lib/db";
import { generateLifestyleImageForAdmin } from "@/lib/lifestyle-image-generation";
import { updateProductBySlug } from "@/lib/products-data-file";
import { isValidStoredImagePath } from "@/lib/catalog-image";
import { loadGenerationImageInputs } from "@/lib/ai-image-inputs";
import { summarizeReferenceInputs } from "@/lib/gemini-image-parts";
import { fetchRemoteImage } from "@/lib/safe-remote-image-fetch";
import { collectLocalImageSources } from "@/lib/admin-local-images";
import { isN3dProtectedImagePath } from "@/lib/n3d-product-image";
import {
    deleteLocalProductImageFile,
    isAdminUploadedLocalPath,
    saveLocalProductImageFile,
} from "@/lib/local-product-image-storage";
import {
    buildStorageObjectPath,
    deleteProductImageFile,
    uploadProductImage,
} from "@/lib/supabase-storage";
import type { ProductAiAsset } from "@/types/product";

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

function syncQueueCandidate(
    entrySlug: string,
    candidate: QueueCandidate,
    status: "generated_pending_review",
    promptVersion: string,
): void {
    upsertQueueEntry((queue) => {
        const entry = queue.items.find((item) => item.slug === entrySlug);
        if (!entry) return;
        entry.status = status;
        entry.prompt_version = promptVersion;
        const existing = entry.candidates.find((c) => c.id === candidate.id);
        if (existing) {
            Object.assign(existing, candidate);
        } else {
            entry.candidates.push(candidate);
        }
    });
}

function syncQueueApproval(slug: string, candidateId: string, reviewer: string): void {
    const now = new Date().toISOString();
    upsertQueueEntry((queue) => {
        const entry = queue.items.find((item) => item.slug === slug);
        if (!entry) return;
        entry.status = "approved";
        entry.approved_candidate_id = candidateId;
        entry.reviewed_by = reviewer;
        entry.reviewed_at = now;
    });
}

function syncQueueRejection(slug: string, candidateId: string, reviewer: string, note?: string): void {
    const now = new Date().toISOString();
    upsertQueueEntry((queue) => {
        const entry = queue.items.find((item) => item.slug === slug);
        if (!entry) return;
        if (entry.approved_candidate_id === candidateId) {
            entry.approved_candidate_id = undefined;
            entry.status = "generated_pending_review";
        }
        entry.reviewed_by = reviewer;
        entry.reviewed_at = now;
        if (note) entry.notes = note;
    });
}

function syncProductsJsonOnApprove(
    slug: string,
    imagePath: string,
    reviewer: string,
    meta: { model?: string; promptVersion: string; generatedAt: string },
): void {
    const now = new Date().toISOString();
    const updated = updateProductBySlug(slug, (product) => {
        const aiAsset: ProductAiAsset = {
            status: "approved",
            source_model: meta.model,
            prompt_version: meta.promptVersion,
            generated_at: meta.generatedAt,
            reviewed_at: now,
            reviewed_by: reviewer,
            approved_image_path: imagePath,
        };
        product.ai_asset = aiAsset;
        product.image_source = "ai-generated";
        product.image_path = imagePath;
    });
    if (!updated) return;
}

function syncProductsJsonOnReject(slug: string, reviewer: string, wasAiApproved: boolean): void {
    const updated = updateProductBySlug(slug, (product) => {
        if (wasAiApproved) {
            product.ai_asset = {
                status: "rejected",
                reviewed_by: reviewer,
                reviewed_at: new Date().toISOString(),
            };
        }
        product.image_source = "n3d-local";
    });
    if (!updated) return;
}

function syncProductsJsonOnApproveLocal(slug: string, imagePath: string): void {
    updateProductBySlug(slug, (product) => {
        product.image_path = imagePath;
        product.image_source = "n3d-local";
    });
}

export async function getPilotProductsWithImages() {
    const slugs = getPilotSlugs();
    return db.product.findMany({
        where: { slug: { in: slugs } },
        include: {
            images: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { name: "asc" },
    });
}

export async function ensureRealPhotoRecordsForProduct(productId: string, slug: string): Promise<void> {
    await db.productImage.updateMany({
        where: { productId, origin: "ai_generated" },
        data: { useAsReference: false },
    });

    const sources = collectLocalImageSources(slug);
    if (sources.length === 0) return;

    const existing = await db.productImage.findMany({
        where: { productId, origin: "real_photo" },
        select: { id: true, imagePath: true, useAsReference: true },
    });
    const byPath = new Map(existing.map((row) => [row.imagePath.trim(), row]));

    for (const source of sources) {
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
        const webPath = await saveLocalProductImageFile(
            product.slug,
            imageRow.id,
            file.buffer,
            file.mimeType,
        );
        return db.productImage.update({
            where: { id: imageRow.id },
            data: { imagePath: webPath, useAsReference: true },
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
    const inputs = await loadGenerationImageInputs(product.slug, productImages);

    if (markedRefs.length === 0) {
        throw new Error(
            "Marca al menos una imagen local/N3D con «Usar como referencia» antes de generar.",
        );
    }
    if (inputs.references.length === 0) {
        const paths = markedRefs.map((img) => img.imagePath).join(", ");
        throw new Error(
            `Hay referencias marcadas pero no se encontraron los archivos en disco: ${paths}. ` +
                "Comprueba public/images/products/ o public/images/uploads/.",
        );
    }

    const cameraYaw = pickLifestyleCameraYawDegrees();
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
        const objectPath = buildStorageObjectPath(
            product.slug,
            imageRow.id,
            generated.contentType,
        );
        const publicUrl = await uploadProductImage(
            objectPath,
            generated.buffer,
            generated.contentType,
        );

        const updated = await db.productImage.update({
            where: { id: imageRow.id },
            data: { imagePath: publicUrl },
        });

        const queueCandidate: QueueCandidate = {
            id: updated.id,
            image_path: publicUrl,
            prompt,
            model: generated.model,
            generated_at: updated.createdAt.toISOString(),
        };

        if (findQueueEntry(product.slug)) {
            syncQueueCandidate(product.slug, queueCandidate, "generated_pending_review", promptVersion);
        }

        return updated;
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
            if (image.imagePath.startsWith("http")) {
                await deleteProductImageFile(image.imagePath);
                storageDeleted = true;
            } else if (
                image.origin === "real_photo" &&
                isAdminUploadedLocalPath(image.imagePath, image.product.slug)
            ) {
                await deleteLocalProductImageFile(image.imagePath, image.product.slug);
                storageDeleted = true;
            }
        } catch (error) {
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

    trySyncQueueRemoveCandidate(image.product.slug, imageId);

    if (wasApproved) {
        try {
            syncProductsJsonOnReject(
                image.product.slug,
                getAdminReviewerName(),
                image.origin === "ai_generated",
            );
        } catch (error) {
            console.warn("products.json no actualizado tras delete:", error);
        }
    }

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

    if (image.origin === "ai_generated") {
        if (findQueueEntry(image.product.slug)) {
            syncQueueApproval(image.product.slug, imageId, reviewer);
        }
        syncProductsJsonOnApprove(image.product.slug, image.imagePath, reviewer, {
            model: image.sourceModel ?? undefined,
            promptVersion: image.promptVersion ?? getDefaultPromptVersion(),
            generatedAt: image.createdAt.toISOString(),
        });
    } else if (image.origin === "real_photo") {
        syncProductsJsonOnApproveLocal(image.product.slug, image.imagePath);
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

    if (findQueueEntry(image.product.slug)) {
        syncQueueRejection(image.product.slug, imageId, reviewer, notes);
    }

    if (image.status === "approved") {
        syncProductsJsonOnReject(
            image.product.slug,
            reviewer,
            image.origin === "ai_generated",
        );
    }

    return db.productImage.findUnique({ where: { id: imageId } });
}

export function getPilotQueueSummary() {
    const queue = readAiImageQueue();
    return queue.items;
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
