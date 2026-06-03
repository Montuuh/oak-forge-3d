import { createHash } from "crypto";

export type ImageSearchCandidate = {
    id: string;
    imageUrl: string;
    thumbnailUrl: string;
    title: string;
    sourcePage: string;
    sourceHost: string;
};

const DEFAULT_LIMIT = 10;

function candidateId(url: string): string {
    return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function hostFromUrl(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

function getImageSearchProvider(): "serper" | "google_cse" {
    const explicit = process.env.IMAGE_SEARCH_PROVIDER?.trim().toLowerCase();
    if (explicit === "serper" || explicit === "google_cse") {
        return explicit;
    }
    if (process.env.SERPER_API_KEY?.trim()) return "serper";
    if (process.env.GOOGLE_CSE_API_KEY?.trim() && process.env.GOOGLE_CSE_ID?.trim()) {
        return "google_cse";
    }
    throw new Error(
        "Configura SERPER_API_KEY en .env.local (recomendado; https://serper.dev — 2500 busquedas gratis). " +
            "Google Custom Search JSON API ya no admite proyectos nuevos.",
    );
}

type SerperImageItem = {
    title?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    link?: string;
    source?: string;
    domain?: string;
};

function parseSearchProviderJson<T>(response: Response, text: string, providerLabel: string): T {
    const trimmed = text.trim();
    if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
        if (providerLabel === "serper") {
            throw new Error(
                "SERPER_API_KEY invalida o ausente. Obtén una clave en https://serper.dev, " +
                    "añádela a .env.local y reinicia el servidor (npm run dev).",
            );
        }
        throw new Error(
            `El proveedor de busqueda (${providerLabel}) devolvio HTML en lugar de JSON. ` +
                "Revisa las variables de entorno y reinicia el servidor.",
        );
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(`Respuesta invalida del proveedor de busqueda (${providerLabel}).`);
    }
}

async function searchWithSerper(query: string, limit: number): Promise<ImageSearchCandidate[]> {
    const apiKey = process.env.SERPER_API_KEY?.trim();
    if (!apiKey) {
        throw new Error("Falta SERPER_API_KEY. Registrate en https://serper.dev");
    }

    const response = await fetch("https://google.serper.dev/images", {
        method: "POST",
        headers: {
            "X-API-KEY": apiKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            q: query,
            num: Math.min(Math.max(limit, 1), 10),
        }),
    });

    const payload = parseSearchProviderJson<{
        message?: string;
        images?: SerperImageItem[];
    }>(response, await response.text(), "serper");

    if (!response.ok) {
        throw new Error(payload.message || `Error Serper (${response.status}).`);
    }

    const seen = new Set<string>();
    const candidates: ImageSearchCandidate[] = [];

    for (const item of payload.images ?? []) {
        const imageUrl = item.imageUrl?.trim();
        if (!imageUrl || seen.has(imageUrl)) continue;
        seen.add(imageUrl);

        const sourcePage = item.link?.trim() || imageUrl;
        candidates.push({
            id: candidateId(imageUrl),
            imageUrl,
            thumbnailUrl: item.thumbnailUrl?.trim() || imageUrl,
            title: item.title?.trim() || "Sin titulo",
            sourcePage,
            sourceHost:
                item.domain?.trim() ||
                item.source?.trim() ||
                hostFromUrl(sourcePage),
        });

        if (candidates.length >= limit) break;
    }

    if (candidates.length === 0) {
        throw new Error(`Sin resultados para «${query}». Prueba otra busqueda.`);
    }

    return candidates;
}

type GoogleCseItem = {
    title?: string;
    link?: string;
    displayLink?: string;
    image?: {
        thumbnailLink?: string;
        contextLink?: string;
    };
};

async function searchWithGoogleCse(query: string, limit: number): Promise<ImageSearchCandidate[]> {
    const apiKey = process.env.GOOGLE_CSE_API_KEY?.trim();
    const cx = process.env.GOOGLE_CSE_ID?.trim();
    if (!apiKey || !cx) {
        throw new Error("Faltan GOOGLE_CSE_API_KEY y GOOGLE_CSE_ID.");
    }

    const params = new URLSearchParams({
        key: apiKey,
        cx,
        q: query,
        searchType: "image",
        num: String(Math.min(Math.max(limit, 1), 10)),
        safe: "active",
    });

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    const payload = parseSearchProviderJson<{
        error?: { message?: string };
        items?: GoogleCseItem[];
    }>(response, await response.text(), "google_cse");

    if (!response.ok) {
        const message = payload.error?.message || `Error de busqueda (${response.status}).`;
        if (/does not have the access to Custom Search JSON API/i.test(message)) {
            throw new Error(
                "Tu proyecto GCP no tiene acceso a Custom Search JSON API (Google ya no la da a cuentas nuevas). " +
                    "Usa Serper: SERPER_API_KEY en .env.local e IMAGE_SEARCH_PROVIDER=serper.",
            );
        }
        throw new Error(message);
    }

    const seen = new Set<string>();
    const candidates: ImageSearchCandidate[] = [];

    for (const item of payload.items ?? []) {
        const imageUrl = item.link?.trim();
        if (!imageUrl || seen.has(imageUrl)) continue;
        seen.add(imageUrl);

        const thumbnailUrl = item.image?.thumbnailLink?.trim() || imageUrl;
        const sourcePage = item.image?.contextLink?.trim() || imageUrl;

        candidates.push({
            id: candidateId(imageUrl),
            imageUrl,
            thumbnailUrl,
            title: item.title?.trim() || "Sin titulo",
            sourcePage,
            sourceHost: item.displayLink?.trim() || hostFromUrl(sourcePage),
        });

        if (candidates.length >= limit) break;
    }

    if (candidates.length === 0) {
        throw new Error(`Sin resultados para «${query}». Prueba otra busqueda manualmente.`);
    }

    return candidates;
}

export async function searchImageCandidates(
    query: string,
    limit = DEFAULT_LIMIT,
): Promise<ImageSearchCandidate[]> {
    const provider = getImageSearchProvider();
    if (provider === "serper") {
        return searchWithSerper(query, limit);
    }
    return searchWithGoogleCse(query, limit);
}

export function getImageSearchProviderLabel(): string {
    try {
        return getImageSearchProvider();
    } catch {
        return "none";
    }
}
