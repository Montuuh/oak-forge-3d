"use client";

import { AdminStudioScenePanel } from "@/components/admin/AdminStudioScenePanel";
import {
    getDefaultPromptVersion,
    PROMPT_VERSION_OPTIONS,
} from "@/lib/ai-image-prompt-versions";
import type { StudioSceneStatus } from "@/lib/studio-scene-types";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminImageActionsProps = {
    productId: string;
    imageId?: string;
    status?: "candidate" | "approved" | "rejected";
    showGenerate?: boolean;
    generateOnly?: boolean;
    candidateCount?: number;
    maxCandidates?: number;
    imageBroken?: boolean;
    canDelete?: boolean;
    studioSceneStatus?: StudioSceneStatus;
    showStudioPanel?: boolean;
    generateLabel?: string;
    promptVersion?: string;
    onPromptVersionChange?: (version: string) => void;
};

async function postJson(url: string, body: Record<string, string | undefined>) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    let payload: { error?: string; ok?: boolean; storageDeleted?: boolean } = {};
    try {
        payload = (await response.json()) as typeof payload;
    } catch {
        payload = {};
    }
    if (!response.ok) {
        throw new Error(payload.error || `Error ${response.status} en la solicitud.`);
    }
    return payload;
}

export function AdminImageActions({
    productId,
    imageId,
    status = "candidate",
    showGenerate = false,
    generateOnly = false,
    candidateCount = 0,
    maxCandidates = 5,
    imageBroken = false,
    canDelete = true,
    studioSceneStatus,
    showStudioPanel = true,
    generateLabel = "Generar candidato AI",
    promptVersion: promptVersionProp,
    onPromptVersionChange,
}: AdminImageActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rejectNotes, setRejectNotes] = useState("");
    const [promptVersionInternal, setPromptVersionInternal] = useState(getDefaultPromptVersion);
    const promptVersion = promptVersionProp ?? promptVersionInternal;
    const setPromptVersion = onPromptVersionChange ?? setPromptVersionInternal;

    async function run(action: string, fn: () => Promise<void>) {
        setError(null);
        setLoading(action);
        try {
            await fn();
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido.");
        } finally {
            setLoading(null);
        }
    }

    const canGenerate = candidateCount < maxCandidates;

    return (
        <div className="space-y-2">
            {error && (
                <p className="text-sm text-red-300" role="alert">
                    {error}
                </p>
            )}

            <div
                className={
                    showGenerate && generateOnly
                        ? "flex flex-wrap items-end gap-3 rounded-xl border border-violet-500/25 bg-violet-950/20 p-3"
                        : "flex flex-wrap gap-2"
                }
            >
                {showGenerate && (
                    <>
                        <label className="flex min-w-[10rem] flex-col gap-1 text-sm text-zinc-400">
                            <span>Prompt</span>
                            <select
                                value={promptVersion}
                                onChange={(e) => setPromptVersion(e.target.value)}
                                disabled={loading !== null || !canGenerate}
                                className="rounded-lg border border-white/10 bg-zinc-900/70 px-2 py-2 text-sm text-zinc-100"
                                aria-label="Version de prompt para generacion AI"
                            >
                                {PROMPT_VERSION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value} title={option.hint}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button
                            type="button"
                            disabled={loading !== null || !canGenerate}
                            onClick={() =>
                                run("generate", async () => {
                                    await postJson("/api/admin/images/generate", {
                                        productId,
                                        promptVersion,
                                    });
                                })
                            }
                            className={
                                generateOnly
                                    ? "rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:opacity-50"
                                    : "rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-600 disabled:opacity-50"
                            }
                        >
                            {loading === "generate" ? "Generando…" : generateLabel}
                        </button>
                    </>
                )}

                {!generateOnly &&
                    imageId &&
                    !imageBroken &&
                    (status === "candidate" || status === "rejected") && (
                    <button
                        type="button"
                        disabled={loading !== null}
                        onClick={() =>
                            run("approve", async () => {
                                await postJson("/api/admin/images/approve", { imageId });
                            })
                        }
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                        {loading === "approve" ? "Aprobando…" : "Aprobar"}
                    </button>
                )}

                {!generateOnly && imageId && status !== "rejected" && (
                    <button
                        type="button"
                        disabled={loading !== null}
                        onClick={() =>
                            run("reject", async () => {
                                await postJson("/api/admin/images/reject", {
                                    imageId,
                                    notes: rejectNotes || undefined,
                                });
                            })
                        }
                        className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                        {loading === "reject" ? "Rechazando…" : "Rechazar"}
                    </button>
                )}

                {!generateOnly && imageId && canDelete && (
                    <button
                        type="button"
                        disabled={loading !== null}
                        onClick={() => {
                            if (
                                !window.confirm(
                                    "Eliminar esta imagen de la base de datos y del almacenamiento?",
                                )
                            ) {
                                return;
                            }
                            void run("delete", async () => {
                                await postJson("/api/admin/images/delete", { imageId });
                            });
                        }}
                        className="rounded-lg border border-zinc-500/50 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                        {loading === "delete" ? "Eliminando…" : "Eliminar"}
                    </button>
                )}
            </div>

            {!generateOnly && imageId && status !== "rejected" && (
                <label className="block text-xs text-zinc-500">
                    Nota de rechazo (opcional)
                    <input
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        className="mt-1 w-full max-w-md rounded-lg border border-white/10 bg-zinc-900/70 px-2 py-1 text-sm text-zinc-200"
                        placeholder="Motivo del rechazo"
                    />
                </label>
            )}

            {showGenerate && showStudioPanel && studioSceneStatus && (
                <AdminStudioScenePanel
                    initialStatus={studioSceneStatus}
                    promptVersion={promptVersion}
                />
            )}

            {showGenerate && !canGenerate && (
                <p className="text-xs text-amber-200/90">
                    Limite de {maxCandidates} candidatos alcanzado. Rechaza uno para generar otro.
                </p>
            )}
        </div>
    );
}
