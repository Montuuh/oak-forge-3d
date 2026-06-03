import dns from "dns/promises";
import net from "net";

const MAX_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

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

export async function fetchRemoteImage(
    rawUrl: string,
): Promise<{ buffer: Buffer; mimeType: string; size: number }> {
    const url = await assertPublicHttpUrl(rawUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url.toString(), {
            signal: controller.signal,
            redirect: "follow",
            headers: {
                "User-Agent": "OakForge3D-Admin/1.0 (reference image import)",
                Accept: "image/*",
            },
        });

        if (!response.ok) {
            throw new Error(`No se pudo descargar la imagen (${response.status}).`);
        }

        const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
        if (!contentType.startsWith("image/")) {
            throw new Error(`El enlace no es una imagen (${contentType || "tipo desconocido"}).`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length === 0) {
            throw new Error("La imagen descargada esta vacia.");
        }
        if (buffer.length > MAX_BYTES) {
            throw new Error("La imagen supera el limite de 8 MB.");
        }

        return { buffer, mimeType: contentType, size: buffer.length };
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Tiempo de espera agotado al descargar la imagen.");
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}
