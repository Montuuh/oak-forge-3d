import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { isN3dProtectedImagePath } from "@/lib/n3d-product-image";

const UPLOADS_PUBLIC_DIR = path.join(process.cwd(), "public", "images", "uploads");

export function extensionForMime(mimeType: string): string {
    const normalized = mimeType.toLowerCase();
    if (normalized.includes("jpeg") || normalized.includes("jpg")) return ".jpg";
    if (normalized.includes("png")) return ".png";
    if (normalized.includes("webp")) return ".webp";
    if (normalized.includes("gif")) return ".gif";
    return ".webp";
}

export function publicPathExists(webPath: string): boolean {
    if (!webPath.startsWith("/")) return false;
    const diskPath = path.join(process.cwd(), "public", webPath.replace(/^\//, ""));
    return fs.existsSync(diskPath);
}

/** Subidas manuales: /images/uploads/{slug}-{imageId}.ext */
export async function saveLocalProductImageFile(
    slug: string,
    imageId: string,
    body: Buffer,
    mimeType: string,
): Promise<string> {
    const ext = extensionForMime(mimeType);
    const filename = `${slug}-${imageId}${ext}`;
    const webPath = `/images/uploads/${filename}`;

    await fsPromises.mkdir(UPLOADS_PUBLIC_DIR, { recursive: true });
    await fsPromises.writeFile(path.join(UPLOADS_PUBLIC_DIR, filename), body);

    return webPath;
}

export function isAdminUploadedLocalPath(webPath: string, slug: string): boolean {
    if (isN3dProtectedImagePath(slug, webPath)) return false;
    if (webPath.startsWith("/images/uploads/")) return true;
    if (!webPath.startsWith("/images/products/")) return false;
    const base = path.basename(webPath);
    const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escaped}-[a-z0-9]+\\.(webp|png|jpe?g|gif)$`, "i").test(base);
}

export async function deleteLocalProductImageFile(webPath: string, slug: string): Promise<void> {
    if (!isAdminUploadedLocalPath(webPath, slug)) return;
    const diskPath = path.join(process.cwd(), "public", webPath.replace(/^\//, ""));
    try {
        await fsPromises.unlink(diskPath);
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") {
            throw error;
        }
    }
}
