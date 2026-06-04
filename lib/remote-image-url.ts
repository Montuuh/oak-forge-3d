/** Mensaje cuando el enlace es una pagina de post (Instagram, etc.), no el archivo de imagen. */
export const SOCIAL_POST_PAGE_IMAGE_HINT =
    "Ese enlace es la pagina del post, no la imagen. En Instagram: abre la publicacion → clic derecho en la foto → " +
    "«Copiar direccion de imagen» (debe ser cdninstagram.com o scontent…). Tambien puedes subir el archivo con «Subir imagen».";

function parseUrl(raw: string): URL | null {
    try {
        return new URL(raw);
    } catch {
        return null;
    }
}

function normalizeHost(hostname: string): string {
    return hostname.toLowerCase().replace(/^www\./, "");
}

export function isInstagramCdnHost(hostname: string): boolean {
    const host = normalizeHost(hostname);
    return host.includes("cdninstagram") || host.startsWith("scontent");
}

export function isInstagramPostPageUrl(rawUrl: string): boolean {
    const parsed = parseUrl(rawUrl);
    if (!parsed) return false;
    const host = normalizeHost(parsed.hostname);
    if (!host.endsWith("instagram.com") && host !== "instagram.com") return false;
    if (isInstagramCdnHost(parsed.hostname)) return false;
    return true;
}

export function isLikelyDirectImageUrl(rawUrl: string): boolean {
    const parsed = parseUrl(rawUrl);
    if (!parsed) return false;

    const pathQuery = `${parsed.pathname}${parsed.search}`;
    if (/\.(jpe?g|png|webp|gif|avif|bmp)(\?|$)/i.test(pathQuery)) {
        return true;
    }

    const host = normalizeHost(parsed.hostname);
    if (isInstagramCdnHost(host)) return true;
    if (host.includes("fbcdn.net")) return true;
    if (host.includes("pinimg.com")) return true;
    if (host === "i.redd.it") return true;

    return false;
}

/**
 * Elige la mejor URL para importar desde resultados de busqueda (Serper / CSE).
 * Prioriza CDN directo; evita enlaces a posts de Instagram cuando hay miniatura CDN.
 */
export function pickSearchResultImageUrl(fields: {
    imageUrl?: string;
    thumbnailUrl?: string;
}): string | null {
    const imageUrl = fields.imageUrl?.trim();
    const thumbnailUrl = fields.thumbnailUrl?.trim();
    const ordered = [imageUrl, thumbnailUrl].filter((url): url is string => Boolean(url));

    for (const url of ordered) {
        if (isLikelyDirectImageUrl(url)) return url;
    }

    for (const url of ordered) {
        if (!isInstagramPostPageUrl(url)) return url;
    }

    return null;
}

export function imageImportErrorForUrl(rawUrl: string, contentType?: string): string | null {
    if (isInstagramPostPageUrl(rawUrl)) {
        return SOCIAL_POST_PAGE_IMAGE_HINT;
    }
    if (contentType?.toLowerCase().includes("text/html")) {
        if (isInstagramPostPageUrl(rawUrl)) {
            return SOCIAL_POST_PAGE_IMAGE_HINT;
        }
        return (
            "El enlace devolvio una pagina web (HTML), no un archivo de imagen. " +
            "Usa «Copiar direccion de imagen» en el navegador o elige otro candidato de la busqueda."
        );
    }
    return null;
}
