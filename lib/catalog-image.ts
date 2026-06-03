/** Ruta publica cuando el producto no tiene imagen principal asignada. */
export const CATALOG_PLACEHOLDER_IMAGE_PATH = "/images/placeholder-pnd.svg";

export function isValidStoredImagePath(imagePath: string | undefined | null): boolean {
    const path = imagePath?.trim();
    if (!path || path === "pending") return false;
    if (path === CATALOG_PLACEHOLDER_IMAGE_PATH) return false;
    return path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/");
}

export function hasCatalogImage(imagePath: string | undefined | null): boolean {
    return isValidStoredImagePath(imagePath);
}
