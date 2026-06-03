"use client";

import type { StudioSceneStatus } from "@/lib/studio-scene-types";
import { PROMPT_VERSION_V7 } from "@/lib/ai-image-prompt-versions";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminStudioScenePanelProps = {
    initialStatus: StudioSceneStatus;
    promptVersion: string;
};

export function AdminStudioScenePanel({
    initialStatus,
    promptVersion,
}: AdminStudioScenePanelProps) {
    const router = useRouter();
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (promptVersion !== PROMPT_VERSION_V7 && !promptVersion.startsWith("v7-")) {
        return null;
    }

    async function refreshStatus() {
        const response = await fetch("/api/admin/studio-scene");
        const payload = (await response.json()) as {
            ok?: boolean;
            status?: StudioSceneStatus;
            error?: string;
        };
        if (!response.ok || !payload.status) {
            throw new Error(payload.error || `Error ${response.status}`);
        }
        setStatus(payload.status);
    }

    async function uploadScene(file: File) {
        setError(null);
        setLoading(true);
        try {
            const formData = new FormData();
            formData.set("file", file);
            const response = await fetch("/api/admin/studio-scene", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as {
                ok?: boolean;
                status?: StudioSceneStatus;
                error?: string;
            };
            if (!response.ok) {
                throw new Error(payload.error || `Error ${response.status}`);
            }
            if (payload.status) setStatus(payload.status);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al subir escena.");
        } finally {
            setLoading(false);
        }
    }

    async function resetToDefault() {
        setError(null);
        setLoading(true);
        try {
            const response = await fetch("/api/admin/studio-scene", { method: "DELETE" });
            const payload = (await response.json()) as {
                ok?: boolean;
                status?: StudioSceneStatus;
                error?: string;
            };
            if (!response.ok) {
                throw new Error(payload.error || `Error ${response.status}`);
            }
            if (payload.status) setStatus(payload.status);
            else await refreshStatus();
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al restaurar escena.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mt-3 rounded-xl border border-violet-500/25 bg-violet-950/20 p-3">
            <p className="text-sm font-medium text-violet-100">Referencia de escena (v7)</p>
            <p className="mt-1 text-xs text-zinc-400">
                Mesa roble + pared gotelé fijas. Por defecto{" "}
                <code className="text-zinc-300">public/images/studio/default.jpg</code>; puedes
                subir otra para todo el catalogo.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
                Activa: <span className="text-zinc-300">{status.label}</span>
                {status.source === "missing" && (
                    <span className="ml-1 text-amber-200/90">
                        — sube una escena antes de generar con v7.
                    </span>
                )}
            </p>

            {status.webPath && (
                <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-zinc-900/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={status.webPath}
                        alt="Referencia de estudio"
                        className="max-h-40 w-full object-cover object-center"
                    />
                </div>
            )}

            {error && (
                <p className="mt-2 text-xs text-red-300" role="alert">
                    {error}
                </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-lg border border-white/15 bg-zinc-900/70 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800">
                    {loading ? "Guardando…" : "Subir escena"}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={loading}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadScene(file);
                            e.target.value = "";
                        }}
                    />
                </label>
                {status.source === "custom" && (
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => void resetToDefault()}
                        className="rounded-lg border border-zinc-500/40 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                        Usar default del repo
                    </button>
                )}
            </div>
        </div>
    );
}
