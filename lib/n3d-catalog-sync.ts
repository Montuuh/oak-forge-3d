import type { Product } from "@prisma/client";
import {
    fetchAllN3dDesignDetails,
    type N3dDesignDetail,
} from "@/lib/n3d-api";
import { emitSyncLog, type N3dSyncLogger } from "@/lib/n3d-sync-log";
import { recordProductN3dSync } from "@/lib/n3d-sync-timestamp";
import { ensureRealPhotoRecordsForProduct } from "@/lib/admin-images";
import { db } from "@/lib/db";
import { mapN3dFilamentsToLines, replaceProductFilaments } from "@/lib/product-filaments";
import { putN3dRender } from "@/lib/product-image-storage";
export type N3dBulkSyncError = { slug: string; message: string };

export type N3dMappedProductFields = {
    name: string;
    category: string;
    n3dSlug: string;
    printTime: string | null;
    printTimeSeconds: number | null;
    weightGrams: number | null;
    pokemonName: string | null;
    pokedexNumber: number | null;
    pokemonTypes: string[];
    longDescription: string | null;
    n3dImageUrl: string | null;
};

function normalizeCategory(raw: string): string {
    return raw === "standard" ? "standard" : "character";
}

export function mapN3dDesignToFieldValues(design: N3dDesignDetail): N3dMappedProductFields {
    return {
        name: design.title?.trim() || design.slug,
        category: normalizeCategory(design.category),
        n3dSlug: design.slug,
        printTime: design.print_time?.trim() || null,
        printTimeSeconds: design.print_time_seconds ?? null,
        weightGrams: design.total_weight_grams ?? null,
        pokemonName: design.pokemon?.name?.trim() || null,
        pokedexNumber: design.pokemon?.pokedex_number ?? null,
        pokemonTypes: design.pokemon?.types ?? [],
        longDescription: design.pokemon?.description?.trim() || null,
        n3dImageUrl: design.image_url?.trim() || null,
    };
}

export type N3dBulkSyncResult = {
    totalInN3d: number;
    processed: number;
    updated: number;
    created: number;
    skipped: number;
    errors: N3dBulkSyncError[];
};

export function designToProductData(design: N3dDesignDetail) {
    const mapped = mapN3dDesignToFieldValues(design);
    return {
        name: mapped.name,
        category: mapped.category,
        n3dSlug: mapped.n3dSlug,
        printTime: mapped.printTime,
        printTimeSeconds: mapped.printTimeSeconds,
        weightGrams: mapped.weightGrams,
        pokemonName: mapped.pokemonName,
        pokedexNumber: mapped.pokedexNumber,
        pokemonTypes: mapped.pokemonTypes,
        longDescription: mapped.longDescription,
    };
}

export async function downloadAndStoreN3dRender(
    productSlug: string,
    productId: string,
    design: N3dDesignDetail,
): Promise<void> {
    const imageUrl = design.image_url?.trim();
    if (!imageUrl) return;

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
        throw new Error(`Descarga render ${imgRes.status}`);
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get("content-type") || "image/webp";
    await putN3dRender(productSlug, buffer, mimeType);
    await ensureRealPhotoRecordsForProduct(productId, productSlug);
}

/** Sobrescribe todos los campos N3D en un producto existente (sin tocar precio, tags, visibilidad, etc.). */
export async function applyFullN3dDataToProduct(
    product: Pick<Product, "id" | "slug">,
    design: N3dDesignDetail,
    options?: { skipImage?: boolean },
): Promise<void> {
    const data = designToProductData(design);
    const filaments = mapN3dFilamentsToLines(design.filaments);

    await db.product.update({
        where: { id: product.id },
        data,
    });

    await replaceProductFilaments(product.id, filaments);

    if (!options?.skipImage) {
        await downloadAndStoreN3dRender(product.slug, product.id, design);
    }

    await recordProductN3dSync(product.id);
}

export async function findProductForN3dDesign(
    design: N3dDesignDetail,
): Promise<Product | null> {
    return db.product.findFirst({
        where: {
            OR: [{ slug: design.slug }, { n3dSlug: design.slug }],
        },
    });
}

export async function productExistsForN3dDesign(design: N3dDesignDetail): Promise<boolean> {
    const found = await findProductForN3dDesign(design);
    return found !== null;
}

export async function createProductFromN3dDesign(
    design: N3dDesignDetail,
    options?: { skipImage?: boolean },
): Promise<Product> {
    const data = designToProductData(design);
    const product = await db.product.create({
        data: {
            slug: design.slug,
            name: data.name,
            category: data.category,
            n3dSlug: data.n3dSlug,
            printTime: data.printTime,
            printTimeSeconds: data.printTimeSeconds,
            weightGrams: data.weightGrams,
            pokemonName: data.pokemonName,
            pokedexNumber: data.pokedexNumber,
            pokemonTypes: data.pokemonTypes,
            longDescription: data.longDescription,
            status: "draft",
            isVisibleInCatalog: false,
            featured: false,
            available: true,
            tags: [],
        },
    });

    await replaceProductFilaments(product.id, mapN3dFilamentsToLines(design.filaments));

    if (!options?.skipImage) {
        await downloadAndStoreN3dRender(product.slug, product.id, design);
    }

    await recordProductN3dSync(product.id);

    return product;
}

export type N3dBulkSyncOptions = {
    designs?: N3dDesignDetail[];
    onLog?: N3dSyncLogger;
};

export async function runN3dMassOverwrite(
    options?: N3dBulkSyncOptions,
): Promise<N3dBulkSyncResult> {
    const onLog = options?.onLog;
    await emitSyncLog(onLog, "Modo: sincronizar todo el catálogo (actualizar + crear faltantes)");
    const catalog =
        options?.designs ?? (await fetchAllN3dDesignDetails({ onLog }));
    const result: N3dBulkSyncResult = {
        totalInN3d: catalog.length,
        processed: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        errors: [],
    };

    await emitSyncLog(onLog, `Procesando ${catalog.length} diseños en base de datos…`);

    for (let index = 0; index < catalog.length; index++) {
        const design = catalog[index];
        const progress = `[${index + 1}/${catalog.length}]`;
        try {
            const existing = await findProductForN3dDesign(design);
            if (!existing) {
                await emitSyncLog(onLog, `${progress} ${design.slug} — creando…`);
                await createProductFromN3dDesign(design);
                result.created += 1;
                result.processed += 1;
                await emitSyncLog(onLog, `${progress} ${design.slug} — creado`, "success");
                continue;
            }
            await emitSyncLog(onLog, `${progress} ${design.slug} — actualizando…`);
            await applyFullN3dDataToProduct(existing, design);
            result.updated += 1;
            result.processed += 1;
            await emitSyncLog(onLog, `${progress} ${design.slug} — actualizado`, "success");
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            result.errors.push({ slug: design.slug, message });
            await emitSyncLog(onLog, `${progress} ${design.slug} — error: ${message}`, "error");
        }
    }

    await emitSyncLog(
        onLog,
        `Fin: ${result.updated} actualizados, ${result.created} creados, ${result.errors.length} errores.`,
        result.errors.length > 0 ? "warn" : "success",
    );

    return result;
}

export async function runN3dImportNew(
    options?: N3dBulkSyncOptions,
): Promise<N3dBulkSyncResult> {
    const onLog = options?.onLog;
    await emitSyncLog(onLog, "Modo: importar solo diseños nuevos");
    const catalog =
        options?.designs ?? (await fetchAllN3dDesignDetails({ onLog }));
    const result: N3dBulkSyncResult = {
        totalInN3d: catalog.length,
        processed: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        errors: [],
    };

    await emitSyncLog(onLog, `Comprobando ${catalog.length} diseños…`);

    for (let index = 0; index < catalog.length; index++) {
        const design = catalog[index];
        const progress = `[${index + 1}/${catalog.length}]`;
        try {
            const exists = await productExistsForN3dDesign(design);
            if (exists) {
                result.skipped += 1;
                await emitSyncLog(onLog, `${progress} ${design.slug} — ya existe, omitido`);
                continue;
            }
            await emitSyncLog(onLog, `${progress} ${design.slug} — creando…`);
            await createProductFromN3dDesign(design);
            result.created += 1;
            result.processed += 1;
            await emitSyncLog(onLog, `${progress} ${design.slug} — creado`, "success");
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            result.errors.push({ slug: design.slug, message });
            await emitSyncLog(onLog, `${progress} ${design.slug} — error: ${message}`, "error");
        }
    }

    await emitSyncLog(
        onLog,
        `Fin: ${result.created} creados, ${result.skipped} omitidos, ${result.errors.length} errores.`,
        result.errors.length > 0 ? "warn" : "success",
    );

    return result;
}
