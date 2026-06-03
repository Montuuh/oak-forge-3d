import path from "path";

/** Ruta canonica del render N3D (inborrable). */
export function getN3dRenderWebPath(slug: string): string {
    return `/images/products/${slug}.webp`;
}

export function isN3dProtectedImagePath(slug: string, imagePath: string): boolean {
    const normalized = imagePath.trim();
    if (!normalized.startsWith("/images/products/")) return false;
    const base = path.basename(normalized).toLowerCase();
    const expected = `${slug.toLowerCase()}.webp`;
    return base === expected;
}

/** Imagen subida manualmente desde admin (borrable). */
export function isManualUploadImagePath(imagePath: string): boolean {
    return imagePath.startsWith("/images/uploads/");
}
