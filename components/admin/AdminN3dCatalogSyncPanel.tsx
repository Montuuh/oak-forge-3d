"use client";

import type { N3dBulkSyncResult } from "@/lib/n3d-catalog-sync";
import type {
    N3dCatalogStreamEvent,
    N3dCatalogSyncMode,
    N3dSyncLogLevel,
    N3dSyncLogLine,
} from "@/lib/n3d-sync-log";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LOG_LEVEL_CLASS: Record<N3dSyncLogLevel, string> = {
    info: "text-zinc-300",
    success: "text-emerald-300",
    warn: "text-amber-300",
    error: "text-red-300",
};

function formatLogTime(at: number): string {
    return new Date(at).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function N3dSyncLogPanel({ lines, active }: { lines: N3dSyncLogLine[]; active: boolean }) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [lines.length]);

    return (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Log del proceso
                </span>
                {active && (
                    <span className="flex items-center gap-1.5 text-xs text-sky-300">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                        En curso…
                    </span>
                )}
            </div>
            <pre
                className="max-h-72 overflow-y-auto p-3 font-mono text-xs leading-relaxed"
                aria-live="polite"
            >
                {lines.length === 0 ? (
                    <span className="text-zinc-600">Esperando eventos…</span>
                ) : (
                    lines.map((line, i) => (
                        <div key={`${line.at}-${i}`} className={LOG_LEVEL_CLASS[line.level]}>
                            <span className="text-zinc-600">{formatLogTime(line.at)} </span>
                            {line.message}
                        </div>
                    ))
                )}
                <div ref={endRef} />
            </pre>
        </div>
    );
}

function ResultSummary({ result, mode }: { result: N3dBulkSyncResult; mode: SyncMode }) {
    return (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
            <p className="font-medium text-emerald-100">Completado</p>
            <ul className="mt-2 space-y-1 text-zinc-300">
                <li>Catálogo N3D: {result.totalInN3d} diseños</li>
                {mode === "overwrite-all" && (
                    <>
                        <li>Actualizados: {result.updated}</li>
                        <li>Creados (no existían): {result.created}</li>
                    </>
                )}
                {mode === "import-new" && (
                    <>
                        <li>Creados: {result.created}</li>
                        <li>Omitidos (ya existían): {result.skipped}</li>
                    </>
                )}
                {result.errors.length > 0 && (
                    <li className="text-amber-200">Errores: {result.errors.length}</li>
                )}
            </ul>
            {result.errors.length > 0 && (
                <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-amber-200/90">
                        Ver errores
                    </summary>
                    <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-red-200/90">
                        {result.errors.map((e) => (
                            <li key={e.slug}>
                                <code>{e.slug}</code>: {e.message}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}

type SyncMode = N3dCatalogSyncMode;

async function consumeCatalogSyncStream(
    mode: SyncMode,
    onLine: (line: N3dSyncLogLine) => void,
): Promise<{ mode: SyncMode; result: N3dBulkSyncResult }> {
    const response = await fetch("/api/admin/n3d-sync/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
    });

    if (!response.ok) {
        const text = await response.text();
        let message = `Error ${response.status}`;
        try {
            const errBody = JSON.parse(text) as { error?: string };
            if (errBody.error) message = errBody.error;
        } catch {
            if (text) message = text.slice(0, 300);
        }
        throw new Error(message);
    }

    if (!response.body) {
        throw new Error("El servidor no devolvió un stream de log.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            const event = JSON.parse(trimmed) as N3dCatalogStreamEvent;

            if (event.type === "log") {
                onLine({
                    at: event.at,
                    level: event.level,
                    message: event.message,
                });
            } else if (event.type === "error") {
                throw new Error(event.message);
            } else if (event.type === "done") {
                return { mode: event.mode, result: event.result };
            }
        }
    }

    throw new Error("El stream terminó sin resultado final.");
}

export function AdminN3dCatalogSyncPanel() {
    const router = useRouter();
    const [loading, setLoading] = useState<SyncMode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [logLines, setLogLines] = useState<N3dSyncLogLine[]>([]);
    const [lastResult, setLastResult] = useState<{
        mode: SyncMode;
        result: N3dBulkSyncResult;
    } | null>(null);

    async function run(mode: SyncMode) {
        const confirmMsg =
            mode === "overwrite-all"
                ? "¿Sincronizar TODO el catálogo N3D? Los existentes se sobrescriben con datos N3D; los que falten se crean en borrador (sin visibilidad en catálogo). No toca precio, tags ni visibilidad de los que ya existían."
                : "¿Importar solo diseños N3D que NO existen en la base de datos? Se crearán en borrador, sin visibilidad en catálogo.";

        if (!window.confirm(confirmMsg)) return;

        setError(null);
        setLoading(mode);
        setLastResult(null);
        setLogLines([]);

        try {
            const payload = await consumeCatalogSyncStream(mode, (line) => {
                setLogLines((prev) => [...prev, line]);
            });
            setLastResult({ mode: payload.mode, result: payload.result });
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Error en sincronización.";
            setError(message);
            setLogLines((prev) => [
                ...prev,
                { at: Date.now(), level: "error", message },
            ]);
        } finally {
            setLoading(null);
        }
    }

    const showLog = loading !== null || logLines.length > 0;

    return (
        <section className="glass rounded-2xl border border-white/10 p-4 md:p-6">
            <h2 className="text-lg font-semibold text-zinc-100">Sync masivo N3D</h2>
            <p className="mt-2 text-sm text-zinc-400">
                Operaciones sobre todo el catálogo N3D (~220 diseños). La API casual permite
                ~5 peticiones/min (~16 llamadas ≈ 3–4 min solo API; más tiempo por descarga de
                renders). Configurable con{" "}
                <code className="text-zinc-500">N3D_API_REQUESTS_PER_MIN</code>.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
                <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => void run("overwrite-all")}
                    className="rounded-lg bg-red-800/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                    {loading === "overwrite-all"
                        ? "Sincronizando…"
                        : "Sincronizar todo el catálogo"}
                </button>
                <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => void run("import-new")}
                    className="rounded-lg bg-emerald-800/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                    {loading === "import-new" ? "Importando…" : "Importar solo nuevos"}
                </button>
            </div>

            <ul className="mt-4 list-inside list-disc space-y-1 text-xs text-zinc-500">
                <li>
                    <strong className="text-zinc-400">Sincronizar todo:</strong> por cada diseño N3D,
                    si existe → sobrescribe todo lo de N3D; si no existe → crea en borrador.
                </li>
                <li>
                    <strong className="text-zinc-400">Importar nuevos:</strong> crea producto solo
                    si no existe (slug ni n3dSlug). Estado borrador, no visible en catálogo.
                </li>
                <li>No modifica: precio, tags, descripción corta, destacado, disponibilidad.</li>
            </ul>

            {showLog && <N3dSyncLogPanel lines={logLines} active={loading !== null} />}

            {error && (
                <p className="mt-4 text-sm text-red-300" role="alert">
                    {error}
                </p>
            )}

            {lastResult && (
                <ResultSummary result={lastResult.result} mode={lastResult.mode} />
            )}
        </section>
    );
}
