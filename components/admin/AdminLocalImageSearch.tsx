"use client";

import {
    buildEffectiveImageSearchQuery,
    IMAGE_SEARCH_VENDOR_READYTOPRINT3D,
} from "@/lib/image-search-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const SEARCH_RESULT_LIMIT = 50;
const PAGE_SIZE = 10;

type SearchCandidate = {
    id: string;
    imageUrl: string;
    thumbnailUrl: string;
    title: string;
    sourcePage: string;
    sourceHost: string;
};

type AdminLocalImageSearchProps = {
    productId: string;
    defaultQuery: string;
    disabled?: boolean;
};

async function readAdminApiJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    try {
        return JSON.parse(text) as T;
    } catch {
        const htmlHint = text.trimStart().startsWith("<")
            ? " El servidor devolvio HTML; si cambiaste .env.local, reinicia npm run dev."
            : "";
        throw new Error(`Respuesta invalida del servidor (${response.status}).${htmlHint}`);
    }
}

export function AdminLocalImageSearch({
    productId,
    defaultQuery,
    disabled = false,
}: AdminLocalImageSearchProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(defaultQuery);
    const [includeReadyToPrint3d, setIncludeReadyToPrint3d] = useState(true);
    const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
    const [page, setPage] = useState(0);
    const [searching, setSearching] = useState(false);
    const [importingId, setImportingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastQuery, setLastQuery] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
    const pageCandidates = useMemo(() => {
        const start = page * PAGE_SIZE;
        return candidates.slice(start, start + PAGE_SIZE);
    }, [candidates, page]);

    async function runSearch() {
        setError(null);
        setSearching(true);
        try {
            const effectiveQuery = buildEffectiveImageSearchQuery(query, includeReadyToPrint3d);
            const response = await fetch("/api/admin/images/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, query: effectiveQuery }),
            });
            const payload = await readAdminApiJson<{
                error?: string;
                query?: string;
                candidates?: SearchCandidate[];
            }>(response);
            if (!response.ok) {
                throw new Error(payload.error || `Error ${response.status}`);
            }
            setCandidates(payload.candidates ?? []);
            setPage(0);
            setLastQuery(payload.query ?? effectiveQuery);
            setOpen(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error en la busqueda.");
        } finally {
            setSearching(false);
        }
    }

    async function importCandidate(candidate: SearchCandidate) {
        setError(null);
        setImportingId(candidate.id);
        try {
            const response = await fetch("/api/admin/images/import-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId,
                    imageUrl: candidate.imageUrl,
                    title: candidate.title,
                    sourcePage: candidate.sourcePage,
                }),
            });
            const payload = await readAdminApiJson<{ error?: string }>(response);
            if (!response.ok) {
                throw new Error(payload.error || `Error ${response.status}`);
            }
            setOpen(false);
            setCandidates([]);
            setPage(0);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al importar.");
        } finally {
            setImportingId(null);
        }
    }

    function goToPage(next: number) {
        setPage(Math.min(Math.max(0, next), totalPages - 1));
    }

    const rangeStart = candidates.length === 0 ? 0 : page * PAGE_SIZE + 1;
    const rangeEnd = Math.min((page + 1) * PAGE_SIZE, candidates.length);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[12rem] flex-1">
                    <span className="mb-1 block text-xs text-zinc-500">Busqueda web (referencia de forma)</span>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={disabled || searching || importingId !== null}
                        className="w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600"
                        placeholder="n3d Bulbasaur ball"
                    />
                </label>
                <label className="flex cursor-pointer items-center gap-2 pb-1.5 text-sm text-zinc-400">
                    <input
                        type="checkbox"
                        checked={includeReadyToPrint3d}
                        onChange={(e) => setIncludeReadyToPrint3d(e.target.checked)}
                        disabled={disabled || searching || importingId !== null}
                        className="rounded border-white/20 bg-zinc-900 text-violet-600 focus:ring-violet-500/50"
                    />
                    <span>
                        Incluir{" "}
                        <code className="text-zinc-300">{IMAGE_SEARCH_VENDOR_READYTOPRINT3D}</code>
                    </span>
                </label>
                <button
                    type="button"
                    disabled={disabled || searching || !query.trim() || importingId !== null}
                    onClick={() => void runSearch()}
                    className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-600 disabled:opacity-50"
                >
                    {searching ? "Buscando…" : `Buscar ${SEARCH_RESULT_LIMIT} candidatos`}
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-300" role="alert">
                    {error}
                </p>
            )}

            {open && candidates.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-zinc-400">
                            Resultados para <strong className="text-zinc-200">{lastQuery}</strong> —{" "}
                            {candidates.length} candidatos, mostrando {rangeStart}–{rangeEnd}. Elige una
                            para subirla como imagen local (referencia de forma). Si Instagram falla,
                            copia la URL directa de la foto (cdninstagram / scontent) o sube el archivo.
                        </p>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="text-xs text-zinc-500 hover:text-zinc-300"
                        >
                            Cerrar
                        </button>
                    </div>

                    <div className="mb-3 flex items-center justify-center gap-3">
                        <button
                            type="button"
                            disabled={page <= 0 || importingId !== null}
                            onClick={() => goToPage(page - 1)}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-white/10 disabled:opacity-40"
                            aria-label="Pagina anterior"
                        >
                            ← Anterior
                        </button>
                        <span className="text-sm text-zinc-400">
                            Pagina {page + 1} de {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={page >= totalPages - 1 || importingId !== null}
                            onClick={() => goToPage(page + 1)}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-white/10 disabled:opacity-40"
                            aria-label="Pagina siguiente"
                        >
                            Siguiente →
                        </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {pageCandidates.map((candidate) => (
                            <div
                                key={candidate.id}
                                className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950/50"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={candidate.thumbnailUrl}
                                    alt={candidate.title}
                                    className="aspect-square w-full object-cover bg-zinc-800"
                                />
                                <div className="space-y-2 p-2">
                                    <p className="line-clamp-2 text-xs text-zinc-400">{candidate.title}</p>
                                    <p className="truncate text-[10px] text-zinc-600">{candidate.sourceHost}</p>
                                    <button
                                        type="button"
                                        disabled={importingId !== null}
                                        onClick={() => void importCandidate(candidate)}
                                        className="w-full rounded-md bg-emerald-700 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                                    >
                                        {importingId === candidate.id ? "Importando…" : "Usar esta"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
