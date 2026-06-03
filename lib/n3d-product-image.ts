import { getLegacyN3dWebPath } from "@/lib/product-image-path";

export { buildN3dObjectPath, isN3dProtectedImagePath } from "@/lib/product-image-path";
export { resolveN3dRenderUrl } from "@/lib/product-image-storage";

/** @deprecated Usar resolveN3dRenderUrl() o URL en BD. Ruta legacy en disco. */
export function getN3dRenderWebPath(slug: string): string {
    return getLegacyN3dWebPath(slug);
}
