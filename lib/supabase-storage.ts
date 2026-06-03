import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "product-images";

export function getSupabaseAdmin(): SupabaseClient {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error(
            "Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local (Project Settings > API).",
        );
    }
    return createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export function getStorageBucketName(): string {
    return process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;
}

export function extensionForContentType(contentType: string): string {
    const normalized = contentType.toLowerCase();
    if (normalized.includes("png")) return "png";
    if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
    if (normalized.includes("webp")) return "webp";
    return "png";
}

export function buildStorageObjectPath(
    slug: string,
    imageId: string,
    contentType = "image/png",
): string {
    const ext = extensionForContentType(contentType);
    return `${slug}/${imageId}.${ext}`;
}

/** Crea el bucket si falta y lo deja publico (necesario para <img> y catalogo exportado). */
export async function ensureProductImagesBucket(): Promise<void> {
    const supabase = getSupabaseAdmin();
    const bucket = getStorageBucketName();

    const { data: existing } = await supabase.storage.getBucket(bucket);
    if (!existing) {
        const { error } = await supabase.storage.createBucket(bucket, { public: true });
        if (error) {
            throw new Error(`No se pudo crear el bucket "${bucket}": ${error.message}`);
        }
        return;
    }

    if (!existing.public) {
        const { error } = await supabase.storage.updateBucket(bucket, { public: true });
        if (error) {
            throw new Error(
                `El bucket "${bucket}" es privado. No se pudo hacer publico: ${error.message}. ` +
                    "En Supabase: Storage → product-images → Make public.",
            );
        }
    }
}

export async function verifyPublicObjectAccessible(publicUrl: string): Promise<void> {
    const response = await fetch(publicUrl, { method: "HEAD" });
    if (!response.ok) {
        throw new Error(
            `La imagen subida no es accesible (${response.status}). Revisa que el bucket sea publico.`,
        );
    }
}

export function getPublicObjectUrl(objectPath: string): string {
    const url = process.env.SUPABASE_URL;
    if (!url) {
        throw new Error("Missing SUPABASE_URL.");
    }
    const bucket = getStorageBucketName();
    return `${url}/storage/v1/object/public/${bucket}/${objectPath}`;
}

export async function uploadProductImage(
    objectPath: string,
    body: Buffer,
    contentType: string,
): Promise<string> {
    await ensureProductImagesBucket();

    const supabase = getSupabaseAdmin();
    const bucket = getStorageBucketName();

    const { error } = await supabase.storage.from(bucket).upload(objectPath, body, {
        contentType,
        upsert: true,
    });

    if (error) {
        throw new Error(`Error al subir imagen a Supabase Storage: ${error.message}`);
    }

    const publicUrl = getPublicObjectUrl(objectPath);
    await verifyPublicObjectAccessible(publicUrl);
    return publicUrl;
}

/** Extrae la ruta del objeto en el bucket desde la URL publica de Supabase. */
export function objectPathFromPublicUrl(publicUrl: string): string | null {
    const bucket = getStorageBucketName();
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = publicUrl.indexOf(marker);
    if (index === -1) return null;
    return publicUrl.slice(index + marker.length);
}

export async function deleteProductImageFile(publicUrl: string): Promise<void> {
    const objectPath = objectPathFromPublicUrl(publicUrl);
    if (!objectPath) return;

    const supabase = getSupabaseAdmin();
    const bucket = getStorageBucketName();
    const { error } = await supabase.storage.from(bucket).remove([objectPath]);
    if (error) {
        console.warn(`No se pudo borrar ${objectPath} en Storage: ${error.message}`);
    }
}
