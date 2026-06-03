import { isValidStoredImagePath } from "@/lib/catalog-image";
import { publicPathExists } from "@/lib/local-product-image-storage";
import { getN3dRenderWebPath, isN3dProtectedImagePath } from "@/lib/n3d-product-image";
import { findProductBySlug } from "@/lib/products-data-file";

export type LocalImageSource = {
    imagePath: string;
    notes: string;
};

export function defaultN3dImagePath(slug: string): string {
    return getN3dRenderWebPath(slug);
}

function isLocalWebPath(imagePath: string): boolean {
    return imagePath.startsWith("/");
}

function labelForJsonImage(
    imageSource: string | undefined,
    imagePath: string,
    slug: string,
): string {
    if (imageSource === "ai-generated") {
        return "products.json (ruta local)";
    }
    if (isN3dProtectedImagePath(slug, imagePath)) {
        return "N3D / sync (protegida)";
    }
    return "products.json (manual u otro)";
}

/** Rutas locales conocidas (JSON + archivo N3D por defecto) para registrar en BD. */
export function collectLocalImageSources(slug: string): LocalImageSource[] {
    const results: LocalImageSource[] = [];
    const seen = new Set<string>();

    function add(imagePath: string, notes: string): void {
        const key = imagePath.trim();
        if (!isValidStoredImagePath(key) || !isLocalWebPath(key) || seen.has(key)) return;
        seen.add(key);
        results.push({ imagePath: key, notes });
    }

    let jsonPrimaryPath: string | null = null;

    try {
        const jsonProduct = findProductBySlug(slug);
        const jsonPath = jsonProduct.image_path?.trim() ?? "";
        const n3dDefault = defaultN3dImagePath(slug);

        if (isValidStoredImagePath(jsonPath) && isLocalWebPath(jsonPath)) {
            jsonPrimaryPath = jsonPath;
            add(jsonPath, labelForJsonImage(jsonProduct.image_source, jsonPath, slug));
        }

        if (
            isValidStoredImagePath(n3dDefault) &&
            n3dDefault !== jsonPrimaryPath &&
            publicPathExists(n3dDefault)
        ) {
            add(n3dDefault, "N3D / sync (protegida)");
        }
    } catch {
        const n3dDefault = defaultN3dImagePath(slug);
        if (publicPathExists(n3dDefault)) {
            add(n3dDefault, "N3D / sync (protegida)");
        }
    }

    return results;
}

export function localImageFileOnDisk(imagePath: string): boolean | null {
    if (!imagePath.startsWith("/")) return null;
    return publicPathExists(imagePath);
}
