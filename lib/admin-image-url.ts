import { isValidStoredImagePath } from "@/lib/catalog-image";

/**
 * URL para mostrar imagenes en admin.
 * Las rutas /api/... evitan buckets privados y extensiones .webp con contenido PNG.
 */
export function getAdminImageDisplayUrl(image: {
    id: string;
    imagePath: string;
}): string {
    if (!isValidStoredImagePath(image.imagePath)) {
        return "";
    }
    if (image.imagePath.startsWith("http")) {
        return `/api/admin/images/serve?id=${encodeURIComponent(image.id)}`;
    }
    return image.imagePath;
}
