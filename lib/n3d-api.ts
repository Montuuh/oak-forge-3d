import { emitSyncLog, type N3dSyncLogger } from "@/lib/n3d-sync-log";

const API_BASE_URL = "https://n3dmelbourne.com/api/v1";

export type N3dDesignSummary = {
    slug: string;
    title: string;
    category: string;
    image_url?: string;
    print_time?: string;
    total_weight_grams?: number;
};

export type N3dFilament = {
    filament_id?: number | null;
    color: string;
    series: string;
    img_swatch?: string | null;
    weight_grams: number;
    product_url?: string;
    affiliate_url?: string;
};

export type N3dPrintProfile = {
    name: string;
    type: "ams" | "split" | "mc" | string;
    print_time?: string;
    print_time_seconds?: number;
    plate_count?: number;
};

export type N3dDesignDetail = {
    slug: string;
    title: string;
    category: string;
    image_url?: string;
    print_time?: string;
    print_time_seconds?: number;
    total_weight_grams?: number;
    pokemon?: {
        name: string;
        pokedex_number: number;
        types: string[];
        description?: string | null;
    };
    filaments?: N3dFilament[];
    profiles?: N3dPrintProfile[];
};

type N3dPagination = {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
};

type N3dDesignsListResponse = {
    data: N3dDesignSummary[];
    pagination: N3dPagination;
};

type N3dDesignsBatchResponse = {
    data: N3dDesignDetail[];
};

function loadN3dApiKey(): string {
    const key = process.env.N3D_API_KEY?.trim();
    if (!key) {
        throw new Error("N3D_API_KEY no configurada en .env.local");
    }
    return key;
}

/** Tier casual N3D: 5 req/min. Ajusta con N3D_API_REQUESTS_PER_MIN (p. ej. 30 en tier superior). */
const DEFAULT_REQUESTS_PER_MIN = 5;

export const BATCH_MAX = 20;

function getN3dMinRequestIntervalMs(): number {
    const raw = process.env.N3D_API_REQUESTS_PER_MIN?.trim();
    const perMin = raw ? Number.parseInt(raw, 10) : DEFAULT_REQUESTS_PER_MIN;
    if (!Number.isFinite(perMin) || perMin < 1) {
        return Math.ceil(60_000 / DEFAULT_REQUESTS_PER_MIN);
    }
    return Math.ceil(60_000 / perMin);
}

let lastN3dApiRequestAt = 0;

async function throttleBeforeN3dRequest(): Promise<void> {
    const minInterval = getN3dMinRequestIntervalMs();
    const now = Date.now();
    const wait = lastN3dApiRequestAt + minInterval - now;
    if (wait > 0) {
        await sleep(wait);
    }
    lastN3dApiRequestAt = Date.now();
}

function parseRetryAfterSeconds(body: string): number | null {
    const match = body.match(/try again in (\d+)\s*seconds?/i);
    if (!match) return null;
    const sec = Number.parseInt(match[1], 10);
    return Number.isFinite(sec) && sec > 0 ? sec : null;
}

export function estimateN3dCatalogApiCalls(designCount: number): {
    listPages: number;
    batchCalls: number;
    total: number;
    minDurationMs: number;
} {
    const listPages = Math.max(1, Math.ceil(designCount / 50));
    const batchCalls = Math.max(1, Math.ceil(designCount / BATCH_MAX));
    const total = listPages + batchCalls;
    const minDurationMs = Math.max(0, total - 1) * getN3dMinRequestIntervalMs();
    return { listPages, batchCalls, total, minDurationMs };
}

type N3dRequestInit = {
    method?: "GET" | "POST";
    body?: unknown;
};

export async function n3dApiRequest<T>(endpoint: string, init?: N3dRequestInit): Promise<T> {
    const apiKey = loadN3dApiKey();
    const method = init?.method ?? "GET";
    let url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
    let attempts = 0;

    while (attempts < 8) {
        await throttleBeforeN3dRequest();

        const response = await fetch(url, {
            method,
            redirect: "manual",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: "application/json",
                ...(init?.body ? { "Content-Type": "application/json" } : {}),
            },
            body: init?.body ? JSON.stringify(init.body) : undefined,
            cache: "no-store",
        });

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("Location");
            if (!location) break;
            url = location.startsWith("http") ? location : new URL(location, url).href;
            attempts++;
            continue;
        }

        if (response.status === 404) {
            throw new Error("Diseño no encontrado en N3D.");
        }

        if (response.status === 429) {
            const body = await response.text();
            const retrySec =
                parseRetryAfterSeconds(body) ??
                Math.ceil(getN3dMinRequestIntervalMs() / 1000);
            await sleep(retrySec * 1000 + 500);
            attempts++;
            continue;
        }

        if (!response.ok) {
            throw new Error(`N3D API ${response.status}: ${await response.text()}`);
        }

        return (await response.json()) as T;
    }

    throw new Error("Demasiados redirects o rate limits en la API N3D");
}

export async function fetchN3dDesign(slug: string): Promise<N3dDesignDetail> {
    const trimmed = slug.trim();
    if (!trimmed) {
        throw new Error("Slug N3D vacío.");
    }
    return n3dApiRequest<N3dDesignDetail>(`/designs/${encodeURIComponent(trimmed)}`);
}

export async function fetchN3dDesignListPage(
    page: number,
    limit = 50,
): Promise<N3dDesignsListResponse> {
    return n3dApiRequest<N3dDesignsListResponse>(
        `/designs?limit=${limit}&page=${page}`,
    );
}

export type FetchAllN3dDesignsOptions = {
    onLog?: N3dSyncLogger;
};

export async function fetchAllN3dDesignSummaries(
    options?: FetchAllN3dDesignsOptions,
): Promise<N3dDesignSummary[]> {
    const onLog = options?.onLog;
    const all: N3dDesignSummary[] = [];
    let page = 1;

    await emitSyncLog(onLog, "Listando catálogo N3D (paginado)…");

    while (true) {
        const res = await fetchN3dDesignListPage(page, 50);
        all.push(...res.data);
        await emitSyncLog(
            onLog,
            `  Página ${page}: +${res.data.length} (total acumulado ${all.length})`,
        );
        if (!res.pagination.has_next) break;
        page += 1;
    }

    return all;
}

export async function fetchN3dDesignsBatch(slugs: string[]): Promise<N3dDesignDetail[]> {
    if (slugs.length === 0) return [];
    if (slugs.length > BATCH_MAX) {
        throw new Error(`Máximo ${BATCH_MAX} slugs por petición batch.`);
    }

    const res = await n3dApiRequest<N3dDesignsBatchResponse>("/designs/batch", {
        method: "POST",
        body: { slugs },
    });
    return res.data ?? [];
}

export async function fetchAllN3dDesignDetails(
    options?: FetchAllN3dDesignsOptions,
): Promise<N3dDesignDetail[]> {
    const onLog = options?.onLog;
    const summaries = await fetchAllN3dDesignSummaries(options);
    const slugs = summaries.map((s) => s.slug);
    const details: N3dDesignDetail[] = [];
    const batchCount = Math.ceil(slugs.length / BATCH_MAX) || 0;

    await emitSyncLog(
        onLog,
        `Descargando detalle de ${slugs.length} diseños en ${batchCount} lote(s)…`,
    );

    for (let i = 0; i < slugs.length; i += BATCH_MAX) {
        const batchIndex = Math.floor(i / BATCH_MAX) + 1;
        const chunk = slugs.slice(i, i + BATCH_MAX);
        await emitSyncLog(
            onLog,
            `  Lote ${batchIndex}/${batchCount} (${chunk.length} slugs)…`,
        );
        const batch = await fetchN3dDesignsBatch(chunk);
        details.push(...batch);
        await emitSyncLog(onLog, `  Lote ${batchIndex} OK (${batch.length} diseños)`, "success");
    }

    await emitSyncLog(
        onLog,
        `Catálogo N3D en memoria: ${details.length} diseños.`,
        "success",
    );

    return details;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function pickPreferredN3dProfile(
    profiles: N3dPrintProfile[] | undefined,
): N3dPrintProfile | undefined {
    if (!profiles?.length) return undefined;
    return profiles.find((p) => p.type === "ams") ?? profiles[0];
}
