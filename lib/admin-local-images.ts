import { isValidStoredImagePath } from "@/lib/catalog-image";
import { resolveN3dRenderUrl } from "@/lib/product-image-storage";

export type LocalImageSource = {
    imagePath: string;
    notes: string;
};

/** Fuentes N3D en Supabase para registrar en BD como real_photo. */
export async function collectLocalImageSources(slug: string): Promise<LocalImageSource[]> {
    const results: LocalImageSource[] = [];
    const seen = new Set<string>();

    function add(imagePath: string, notes: string): void {
        const key = imagePath.trim();
        if (!isValidStoredImagePath(key) || seen.has(key)) return;
        seen.add(key);
        results.push({ imagePath: key, notes });
    }

    const n3dUrl = await resolveN3dRenderUrl(slug);
    if (n3dUrl) {
        add(n3dUrl, "N3D / sync (protegida)");
    }

    return results;
}
