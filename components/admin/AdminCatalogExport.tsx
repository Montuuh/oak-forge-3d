"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ExportResponse = {
    ok?: boolean;
    error?: string;
    productCount?: number;
    placeholderCount?: number;
    lastUpdated?: string;
    message?: string;
};

export function AdminCatalogExport({ compact = false }: { compact?: boolean }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function runExport() {
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const response = await fetch("/api/admin/catalog/export", { method: "POST" });
            const payload = (await response.json()) as ExportResponse;
            if (!response.ok) {
                throw new Error(payload.error || `Error ${response.status}`);
            }
            setMessage(payload.message ?? `Exportados ${payload.productCount ?? 0} productos.`);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al exportar.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={compact ? "inline-flex flex-col gap-1" : "space-y-2"}>
            <button
                type="button"
                disabled={loading}
                onClick={() => void runExport()}
                className={
                    compact
                        ? "rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-100 transition hover:bg-sky-500/20 disabled:opacity-50"
                        : "rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/20 disabled:opacity-50"
                }
            >
                {loading ? "Exportando…" : "Exportar catálogo público"}
            </button>
            {!compact && (
                <p className="text-xs text-zinc-500">
                    En Vercel el sitio lee el catalogo desde la BD si hay DATABASE_URL. El JSON
                    sirve de snapshot para git y respaldo.
                </p>
            )}
            {message && (
                <p className="text-xs text-emerald-300" role="status">
                    {message}
                </p>
            )}
            {error && (
                <p className="text-xs text-red-300" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
