import fs from "fs/promises";
import path from "path";
import { isValidStoredImagePath } from "@/lib/catalog-image";
import { publicPathExists } from "@/lib/local-product-image-storage";
import { isN3dProtectedImagePath } from "@/lib/n3d-product-image";

export type ImageFilePayload = {
    buffer: Buffer;
    mimeType: string;
    webPath: string;
};

/** N3D → color. Subidas locales → forma. `color_geometry` solo si una ref debe cubrir ambos. */
export type ReferenceImageRole = "color" | "geometry" | "color_geometry";

export type ReferenceImageInput = ImageFilePayload & {
    imageId: string;
    role: ReferenceImageRole;
    label: string;
};

export type GenerationImageInputs = {
    references: ReferenceImageInput[];
};

const ROLE_SORT_ORDER: Record<ReferenceImageRole, number> = {
    geometry: 0,
    color: 1,
    color_geometry: 2,
};

function guessMime(filePath: string, fallback?: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".gif") return "image/gif";
    if (ext === ".webp") return "image/webp";
    return fallback || "image/webp";
}

async function readPublicImage(webPath: string): Promise<ImageFilePayload | undefined> {
    if (!publicPathExists(webPath)) return undefined;
    const diskPath = path.join(process.cwd(), "public", webPath.replace(/^\//, ""));
    const buffer = await fs.readFile(diskPath);
    return { buffer, mimeType: guessMime(diskPath), webPath };
}

async function readRemoteImage(url: string): Promise<ImageFilePayload | undefined> {
    try {
        const response = await fetch(url);
        if (!response.ok) return undefined;
        const buffer = Buffer.from(await response.arrayBuffer());
        const mimeType = response.headers.get("content-type") || guessMime(url);
        return { buffer, mimeType, webPath: url };
    } catch {
        return undefined;
    }
}

async function readImageFile(webPath: string): Promise<ImageFilePayload | undefined> {
    if (webPath.startsWith("http://") || webPath.startsWith("https://")) {
        return readRemoteImage(webPath);
    }
    if (webPath.startsWith("/")) {
        return readPublicImage(webPath);
    }
    return undefined;
}

function assignReferenceRole(slug: string, imagePath: string): ReferenceImageRole {
    if (isN3dProtectedImagePath(slug, imagePath)) {
        return "color";
    }
    return "geometry";
}

function sortReferences(references: ReferenceImageInput[]): ReferenceImageInput[] {
    return [...references].sort(
        (a, b) => ROLE_SORT_ORDER[a.role] - ROLE_SORT_ORDER[b.role],
    );
}

export function hasColorReference(inputs: GenerationImageInputs): boolean {
    return inputs.references.some((ref) => ref.role === "color" || ref.role === "color_geometry");
}

export function hasGeometryReference(inputs: GenerationImageInputs): boolean {
    return inputs.references.some((ref) => ref.role === "geometry" || ref.role === "color_geometry");
}

export function hasN3dColorReference(slug: string, inputs: GenerationImageInputs): boolean {
    return inputs.references.some(
        (ref) => ref.role === "color" && isN3dProtectedImagePath(slug, ref.webPath),
    );
}

export async function loadGenerationImageInputs(
    slug: string,
    images: {
        id: string;
        origin: string;
        imagePath: string;
        useAsReference: boolean;
        notes: string | null;
    }[],
): Promise<GenerationImageInputs> {
    const marked = images.filter(
        (img) =>
            img.origin === "real_photo" &&
            img.useAsReference &&
            isValidStoredImagePath(img.imagePath),
    );

    const references: ReferenceImageInput[] = [];

    for (const img of marked) {
        const file = await readImageFile(img.imagePath);
        if (!file) continue;

        const n3d = isN3dProtectedImagePath(slug, img.imagePath);
        references.push({
            ...file,
            imageId: img.id,
            role: assignReferenceRole(slug, img.imagePath),
            label: img.notes?.trim() || (n3d ? "N3D / sync" : "Referencia local"),
        });
    }

    return { references: sortReferences(references) };
}
