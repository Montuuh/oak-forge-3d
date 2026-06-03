import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import {
    buildN3dObjectPath,
    classifyStoredImagePath,
    getLegacyN3dWebPath,
    getObjectPathFromImageRef,
    isAiGeneratedStoragePath,
    isManualUploadImagePath,
    isN3dProtectedImagePath,
    isStoredOnSupabase,
    N3D_RENDER_BASENAME,
    type ProductImageFolder,
} from "@/lib/product-image-path";
import {
    deleteProductImageFile,
    extensionForContentType,
    getPublicObjectUrl,
    objectPathFromPublicUrl,
    uploadProductImage,
} from "@/lib/supabase-storage";

export type { ProductImageFolder } from "@/lib/product-image-path";
export {
    buildN3dObjectPath,
    classifyStoredImagePath,
    getLegacyN3dWebPath,
    getObjectPathFromImageRef,
    isAiGeneratedStoragePath,
    isManualUploadImagePath,
    isN3dProtectedImagePath,
    isStoredOnSupabase,
    N3D_RENDER_BASENAME,
} from "@/lib/product-image-path";

const LEGACY_PRODUCTS_DIR = path.join(process.cwd(), "public", "images", "products");
const LEGACY_UPLOADS_DIR = path.join(process.cwd(), "public", "images", "uploads");

export function extensionForMime(mimeType: string): string {
    const normalized = mimeType.toLowerCase();
    if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
    if (normalized.includes("png")) return "png";
    if (normalized.includes("webp")) return "webp";
    if (normalized.includes("gif")) return "gif";
    return "webp";
}

export function buildAiObjectPath(slug: string, imageId: string, contentType: string): string {
    const ext = extensionForContentType(contentType);
    return `${slug}/ai/${imageId}.${ext}`;
}

export function buildUploadObjectPath(slug: string, imageId: string, mimeType: string): string {
    const ext = extensionForMime(mimeType);
    return `${slug}/uploads/${imageId}.${ext}`;
}

async function urlExists(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: "HEAD" });
        return response.ok;
    } catch {
        return false;
    }
}

export async function resolveN3dRenderUrl(slug: string): Promise<string | null> {
    for (const ext of ["webp", "jpg", "jpeg", "png"]) {
        const storageUrl = getPublicObjectUrl(buildN3dObjectPath(slug, ext));
        if (await urlExists(storageUrl)) return storageUrl;
    }

    for (const ext of [".webp", ".jpg", ".jpeg", ".png"]) {
        const legacy = getLegacyN3dWebPath(slug, ext);
        const diskPath = path.join(process.cwd(), "public", legacy.replace(/^\//, ""));
        if (fs.existsSync(diskPath)) return legacy;
    }

    return null;
}

export async function putN3dRender(
    slug: string,
    body: Buffer,
    mimeType: string,
): Promise<string> {
    const objectPath = buildN3dObjectPath(slug, extensionForMime(mimeType));
    return uploadProductImage(objectPath, body, mimeType);
}

export async function putAiImage(
    slug: string,
    imageId: string,
    body: Buffer,
    contentType: string,
): Promise<string> {
    const objectPath = buildAiObjectPath(slug, imageId, contentType);
    return uploadProductImage(objectPath, body, contentType);
}

export async function putUploadImage(
    slug: string,
    imageId: string,
    body: Buffer,
    mimeType: string,
): Promise<string> {
    const objectPath = buildUploadObjectPath(slug, imageId, mimeType);
    return uploadProductImage(objectPath, body, mimeType);
}

export async function deleteStoredProductImage(
    imagePath: string,
    slug: string,
): Promise<void> {
    if (isN3dProtectedImagePath(slug, imagePath)) {
        throw new Error("Las imagenes N3D (render sync) no se pueden eliminar.");
    }

    if (isStoredOnSupabase(imagePath)) {
        await deleteProductImageFile(imagePath);
        return;
    }

    if (imagePath.startsWith("/")) {
        const diskPath = path.join(process.cwd(), "public", imagePath.replace(/^\//, ""));
        try {
            await fsPromises.unlink(diskPath);
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== "ENOENT") throw error;
        }
    }
}

export type LegacyDiskFile = {
    kind: ProductImageFolder;
    slug: string;
    diskPath: string;
    imageId?: string;
    mimeType: string;
};

export function listLegacyProductImageFiles(): LegacyDiskFile[] {
    const results: LegacyDiskFile[] = [];

    if (fs.existsSync(LEGACY_PRODUCTS_DIR)) {
        for (const name of fs.readdirSync(LEGACY_PRODUCTS_DIR)) {
            const match = name.match(/^(.+)\.(webp|jpe?g|png|gif)$/i);
            if (!match) continue;
            const [, slug, ext] = match;
            const mimeType =
                ext.toLowerCase() === "jpg" || ext.toLowerCase() === "jpeg"
                    ? "image/jpeg"
                    : ext.toLowerCase() === "png"
                      ? "image/png"
                      : "image/webp";
            results.push({
                kind: "n3d",
                slug,
                diskPath: path.join(LEGACY_PRODUCTS_DIR, name),
                mimeType,
            });
        }
    }

    if (fs.existsSync(LEGACY_UPLOADS_DIR)) {
        for (const name of fs.readdirSync(LEGACY_UPLOADS_DIR)) {
            const match = name.match(/^(.+)-([a-z0-9]+)\.(webp|jpe?g|png|gif)$/i);
            if (!match) continue;
            const [, slug, imageId, ext] = match;
            const mimeType =
                ext.toLowerCase() === "jpg" || ext.toLowerCase() === "jpeg"
                    ? "image/jpeg"
                    : ext.toLowerCase() === "png"
                      ? "image/png"
                      : "image/webp";
            results.push({
                kind: "uploads",
                slug,
                imageId,
                diskPath: path.join(LEGACY_UPLOADS_DIR, name),
                mimeType,
            });
        }
    }

    return results;
}

export async function migrateLegacyAiObjectPath(
    slug: string,
    imagePath: string,
): Promise<string | null> {
    const objectPath = objectPathFromPublicUrl(imagePath);
    if (!objectPath) return null;

    const newPathMatch = objectPath.match(/^([^/]+)\/ai\/([^/]+)$/);
    if (newPathMatch) return null;

    const oldFlatMatch = objectPath.match(/^([^/]+)\/([^./]+)\.(png|jpe?g|jpg|webp|gif)$/i);
    if (!oldFlatMatch) {
        const oldUploadsMatch = objectPath.match(/^uploads\/([^/]+)\/([^/]+)$/);
        if (oldUploadsMatch) {
            const [, s, filename] = oldUploadsMatch;
            const target = `${s}/uploads/${filename}`;
            if (target === objectPath) return null;
            const response = await fetch(imagePath);
            if (!response.ok) return null;
            const buffer = Buffer.from(await response.arrayBuffer());
            const mime = response.headers.get("content-type") || "image/png";
            await deleteProductImageFile(imagePath);
            return uploadProductImage(target, buffer, mime);
        }
        return null;
    }

    const [, objectSlug, imageId, ext] = oldFlatMatch;
    if (objectSlug !== slug) return null;

    const target = `${slug}/ai/${imageId}.${ext}`;
    const response = await fetch(imagePath);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const mime = response.headers.get("content-type") || `image/${ext}`;
    await deleteProductImageFile(imagePath);
    return uploadProductImage(target, buffer, mime);
}
