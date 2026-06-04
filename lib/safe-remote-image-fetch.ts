import dns from "dns/promises";
import net from "net";
import {
    imageImportErrorForUrl,
    isInstagramPostPageUrl,
    SOCIAL_POST_PAGE_IMAGE_HINT,
} from "@/lib/remote-image-url";

const MAX_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_HTML_REDIRECT_DEPTH = 2;
const BROWSER_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function isPrivateIp(address: string): boolean {
    if (net.isIPv4(address)) {
        const parts = address.split(".").map(Number);
        if (parts[0] === 10) return true;
        if (parts[0] === 127) return true;
        if (parts[0] === 0) return true;
        if (parts[0] === 169 && parts[1] === 254) return true;
        if (parts[0] === 192 && parts[1] === 168) return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        return false;
    }
    if (net.isIPv6(address)) {
        const normalized = address.toLowerCase();
        if (normalized === "::1") return true;
        if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
        if (normalized.startsWith("fe80")) return true;
    }
    return false;
}

async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error("URL de imagen invalida.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Solo se permiten URLs http(s).");
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
        hostname === "localhost" ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
    ) {
        throw new Error("URL de imagen no permitida.");
    }

    if (net.isIP(hostname)) {
        if (isPrivateIp(hostname)) {
            throw new Error("URL de imagen no permitida.");
        }
        return parsed;
    }

    const records = await dns.lookup(hostname, { all: true });
    if (records.length === 0) {
        throw new Error("No se pudo resolver el host de la imagen.");
    }
    for (const record of records) {
        if (isPrivateIp(record.address)) {
            throw new Error("URL de imagen no permitida.");
        }
    }

    return parsed;
}

function extractOgImageUrl(html: string, pageUrl: string): string | null {
    const metaTags = html.match(/<meta\s[^>]*>/gi) ?? [];
    for (const tag of metaTags) {
        const lower = tag.toLowerCase();
        const isOg = lower.includes('property="og:image') || lower.includes("property='og:image");
        const isTwitter =
            lower.includes('name="twitter:image') || lower.includes("name='twitter:image");
        if (!isOg && !isTwitter) continue;

        const content = tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1]?.trim();
        if (!content) continue;

        try {
            return new URL(content, pageUrl).toString();
        } catch {
            continue;
        }
    }
    return null;
}

async function downloadOnce(
    url: URL,
): Promise<{ buffer: Buffer; contentType: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url.toString(), {
            signal: controller.signal,
            redirect: "follow",
            headers: {
                "User-Agent": BROWSER_USER_AGENT,
                Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
        });

        if (!response.ok) {
            throw new Error(`No se pudo descargar la imagen (${response.status}).`);
        }

        const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
        const buffer = Buffer.from(await response.arrayBuffer());
        return { buffer, contentType };
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Tiempo de espera agotado al descargar la imagen.");
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchRemoteImageInner(
    rawUrl: string,
    depth: number,
): Promise<{ buffer: Buffer; mimeType: string; size: number }> {
    const url = await assertPublicHttpUrl(rawUrl);

    if (depth === 0 && isInstagramPostPageUrl(rawUrl)) {
        throw new Error(SOCIAL_POST_PAGE_IMAGE_HINT);
    }

    const { buffer, contentType } = await downloadOnce(url);

    if (!contentType.startsWith("image/")) {
        if (contentType.includes("text/html") && depth < MAX_HTML_REDIRECT_DEPTH) {
            const html = buffer.toString("utf8", 0, Math.min(buffer.length, 512_000));
            const ogUrl = extractOgImageUrl(html, url.toString());
            if (ogUrl && ogUrl !== rawUrl) {
                return fetchRemoteImageInner(ogUrl, depth + 1);
            }
        }

        const hint = imageImportErrorForUrl(rawUrl, contentType);
        if (hint) {
            throw new Error(hint);
        }
        throw new Error(`El enlace no es una imagen (${contentType || "tipo desconocido"}).`);
    }

    if (buffer.length === 0) {
        throw new Error("La imagen descargada esta vacia.");
    }
    if (buffer.length > MAX_BYTES) {
        throw new Error("La imagen supera el limite de 8 MB.");
    }

    return { buffer, mimeType: contentType, size: buffer.length };
}

export async function fetchRemoteImage(
    rawUrl: string,
): Promise<{ buffer: Buffer; mimeType: string; size: number }> {
    try {
        return await fetchRemoteImageInner(rawUrl, 0);
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error("No se pudo descargar la imagen.");
    }
}
