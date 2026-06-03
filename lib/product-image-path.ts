export type ProductImageFolder = "ai" | "n3d" | "uploads";

function objectPathFromPublicUrl(publicUrl: string): string | null {
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+?)(?:\?|$)/);
    if (!match?.[1]) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

export const N3D_RENDER_BASENAME = "render";

function fileBaseName(webPath: string): string {
    const parts = webPath.split("/");
    return parts[parts.length - 1] ?? "";
}

function fileExtension(base: string): string {
    const match = base.match(/\.([^.]+)$/);
    return match?.[1] ?? "webp";
}

export function buildN3dObjectPath(slug: string, ext = "webp"): string {
    return `${slug}/n3d/${N3D_RENDER_BASENAME}.${ext.replace(/^\./, "")}`;
}

export function getLegacyN3dWebPath(slug: string, ext = ".webp"): string {
    return `/images/products/${slug}${ext}`;
}

export function getObjectPathFromImageRef(imagePath: string): string | null {
    const trimmed = imagePath.trim();
    if (!trimmed) return null;

    const fromUrl = objectPathFromPublicUrl(trimmed);
    if (fromUrl) return fromUrl;

    if (trimmed.startsWith("/images/products/")) {
        const base = fileBaseName(trimmed);
        const slug = base.replace(/\.(webp|jpe?g|png|gif)$/i, "");
        const ext = fileExtension(base);
        return buildN3dObjectPath(slug, ext);
    }

    if (trimmed.startsWith("/images/uploads/")) {
        const base = fileBaseName(trimmed);
        const match = base.match(/^(.+)-([a-z0-9]+)\.(webp|jpe?g|png|gif)$/i);
        if (match) {
            const [, slug, imageId, ext] = match;
            return `${slug}/uploads/${imageId}.${ext}`;
        }
    }

    return null;
}

export function classifyStoredImagePath(
    slug: string,
    imagePath: string,
): ProductImageFolder | "legacy" | "static" | "unknown" {
    const trimmed = imagePath.trim();
    if (!trimmed) return "unknown";

    if (trimmed.startsWith("/images/studio/")) return "static";

    const objectPath = getObjectPathFromImageRef(trimmed);
    if (objectPath) {
        if (objectPath.startsWith(`${slug}/n3d/`)) return "n3d";
        if (objectPath.startsWith(`${slug}/ai/`)) return "ai";
        if (objectPath.startsWith(`${slug}/uploads/`)) return "uploads";
        if (objectPath.startsWith("uploads/")) return "uploads";
        if (objectPath.includes("/ai/")) return "ai";
        if (objectPath.includes("/n3d/")) return "n3d";
        const parts = objectPath.split("/");
        if (parts.length === 2 && parts[0] === slug) return "ai";
    }

    if (trimmed.startsWith("/images/products/")) return "legacy";
    if (trimmed.startsWith("/images/uploads/")) return "legacy";

    return "unknown";
}

export function isN3dProtectedImagePath(slug: string, imagePath: string): boolean {
    const kind = classifyStoredImagePath(slug, imagePath);
    if (kind === "n3d") return true;
    if (kind === "legacy" && imagePath.startsWith("/images/products/")) {
        const base = fileBaseName(imagePath).replace(/\.[^.]+$/, "");
        return base === slug;
    }
    return false;
}

export function isManualUploadImagePath(slug: string, imagePath: string): boolean {
    const kind = classifyStoredImagePath(slug, imagePath);
    return kind === "uploads" || (kind === "legacy" && imagePath.startsWith("/images/uploads/"));
}

export function isAiGeneratedStoragePath(slug: string, imagePath: string): boolean {
    return classifyStoredImagePath(slug, imagePath) === "ai";
}

export function isStoredOnSupabase(imagePath: string): boolean {
    return imagePath.startsWith("http://") || imagePath.startsWith("https://");
}

/** Indicador para UI admin: Supabase/URL = disponible; rutas /public legacy = desconocido en cliente. */
export function referenceImageAvailableOnDisk(imagePath: string): boolean | null {
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return true;
    }
    if (imagePath.startsWith("/")) return null;
    return null;
}
