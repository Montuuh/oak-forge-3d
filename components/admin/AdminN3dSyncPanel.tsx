"use client";

import type { FilamentLine } from "@/lib/product-filaments";
import type {
    N3dSyncChoice,
    N3dSyncFieldKey,
    N3dSyncFilamentsPreview,
    N3dSyncImagePreview,
    N3dSyncPreview,
} from "@/lib/n3d-product-sync";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type AdminN3dSyncPanelProps = {
    slug: string;
    n3dSlug: string | null;
    /** Texto ya formateado desde el servidor (evita hydration). */
    n3dSyncedAtLabel: string;
    /** Sin borde propio: va dentro de Acciones. */
    embedded?: boolean;
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const payload = (await response.json()) as T & { error?: string };
    if (!response.ok) {
        throw new Error(payload.error || `Error ${response.status}`);
    }
    return payload;
}

function initialChoices(preview: N3dSyncPreview): Record<N3dSyncFieldKey, N3dSyncChoice> {
    const out = {} as Record<N3dSyncFieldKey, N3dSyncChoice>;
    for (const row of preview.rows) {
        out[row.key] = row.defaultChoice;
    }
    out.n3dImage = "new";
    out.filaments = preview.filaments.defaultChoice;
    return out;
}

function FilamentMiniTable({ lines, emptyLabel }: { lines: FilamentLine[]; emptyLabel: string }) {
    if (!lines.length) {
        return <p className="text-sm text-zinc-600">{emptyLabel}</p>;
    }
    return (
        <table className="w-full text-left text-xs">
            <thead>
                <tr className="text-zinc-500">
                    <th className="pb-1 font-medium">Color</th>
                    <th className="pb-1 font-medium">Serie</th>
                    <th className="pb-1 text-right font-medium">g</th>
                </tr>
            </thead>
            <tbody>
                {lines.map((line, i) => (
                    <tr key={`${line.color}-${line.series}-${i}`} className="border-t border-white/5">
                        <td className="py-1.5 text-zinc-200">{line.color}</td>
                        <td className="py-1.5 text-zinc-400">{line.series}</td>
                        <td className="py-1.5 text-right text-zinc-300">{line.weightGrams}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function N3dFilamentsCompare({
    filaments,
    choice,
    onChoice,
    slug,
}: {
    filaments: N3dSyncFilamentsPreview;
    choice: N3dSyncChoice;
    onChoice: (value: N3dSyncChoice) => void;
    slug: string;
}) {
    return (
        <div
            className={`rounded-xl border p-4 ${
                filaments.changed ? "border-amber-500/25 bg-amber-500/5" : "border-white/10 bg-black/20"
            }`}
        >
            <h3 className="text-sm font-semibold text-zinc-200">
                Filamentos
                {filaments.changed && (
                    <span className="ml-1 text-amber-400/90">*</span>
                )}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
                Color, serie y gramos por filamento (inventario futuro). No se guardan en tags ni
                en la descripción corta.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div
                    className={`flex-1 rounded-xl border p-3 ${
                        choice === "old" ? "border-sky-500/50 bg-sky-500/10" : "border-white/10"
                    }`}
                >
                    <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
                        Actual (BD)
                    </p>
                    <FilamentMiniTable lines={filaments.oldLines} emptyLabel="Sin filamentos" />
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs">
                        <input
                            type="radio"
                            name={`n3d-filaments-${slug}`}
                            checked={choice === "old"}
                            onChange={() => onChoice("old")}
                            className="rounded-full"
                        />
                        <span className={choice === "old" ? "text-sky-200" : "text-zinc-400"}>
                            Mantener actual
                        </span>
                    </label>
                </div>
                <div
                    className={`flex-1 rounded-xl border p-3 ${
                        choice === "new" ? "border-sky-500/50 bg-sky-500/10" : "border-white/10"
                    }`}
                >
                    <p className="mb-2 text-xs font-medium uppercase text-zinc-500">N3D</p>
                    <FilamentMiniTable lines={filaments.newLines} emptyLabel="Sin datos en API" />
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs">
                        <input
                            type="radio"
                            name={`n3d-filaments-${slug}`}
                            checked={choice === "new"}
                            onChange={() => onChoice("new")}
                            className="rounded-full"
                        />
                        <span className={choice === "new" ? "text-sky-200" : "text-zinc-400"}>
                            Usar N3D
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );
}

function SyncImageThumb({
    url,
    label,
    side,
    selected,
    groupName,
    onSelect,
}: {
    url: string | null;
    label: string;
    side: N3dSyncChoice;
    selected: boolean;
    groupName: string;
    onSelect: (value: N3dSyncChoice) => void;
}) {
    return (
        <div
            className={`flex flex-1 flex-col rounded-xl border p-3 transition ${
                selected ? "border-sky-500/50 bg-sky-500/10" : "border-white/10 bg-black/20"
            }`}
        >
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {label}
            </p>
            <div className="relative mx-auto aspect-square w-full max-w-[140px] overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={url}
                        alt={label}
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full min-h-[100px] items-center justify-center px-2 text-center text-xs text-zinc-600">
                        Sin imagen
                    </div>
                )}
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center justify-center gap-2 text-xs">
                <input
                    type="radio"
                    name={groupName}
                    checked={selected}
                    onChange={() => onSelect(side)}
                    className="rounded-full"
                />
                <span className={selected ? "text-sky-200" : "text-zinc-400"}>
                    {side === "old" ? "Mantener actual" : "Usar N3D"}
                </span>
            </label>
        </div>
    );
}

function N3dImageCompare({
    image,
    slug,
    choice,
    onChoice,
}: {
    image: N3dSyncImagePreview;
    slug: string;
    choice: N3dSyncChoice;
    onChoice: (value: N3dSyncChoice) => void;
}) {
    const hasAny = image.oldUrl || image.newUrl;

    return (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-zinc-200">Render N3D</h3>
            <p className="mt-1 text-xs text-zinc-500">
                Compara el render en Storage con el thumbnail de la API. Si eliges N3D, se
                descarga y sube a Supabase en{" "}
                <code className="text-zinc-400">{image.storageHint}</code>.
            </p>

            {hasAny ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <SyncImageThumb
                        url={image.oldUrl}
                        label={image.oldCaption}
                        side="old"
                        selected={choice === "old"}
                        groupName={`n3d-image-${slug}`}
                        onSelect={onChoice}
                    />
                    <SyncImageThumb
                        url={image.newUrl}
                        label={image.newCaption}
                        side="new"
                        selected={choice === "new"}
                        groupName={`n3d-image-${slug}`}
                        onSelect={onChoice}
                    />
                </div>
            ) : (
                <p className="mt-3 text-sm text-zinc-500">
                    No hay render en Storage ni thumbnail en N3D para comparar.
                </p>
            )}

            {choice === "new" && image.newUrl && (
                <p className="mt-3 text-xs text-amber-200/90">
                    Al aplicar: descarga desde CDN N3D → subida a{" "}
                    <code className="text-amber-100/80">{slug}/n3d/</code>
                </p>
            )}
        </div>
    );
}

export function AdminN3dSyncPanel({
    slug,
    n3dSlug,
    n3dSyncedAtLabel,
    embedded = false,
}: AdminN3dSyncPanelProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<N3dSyncPreview | null>(null);
    const [choices, setChoices] = useState<Record<N3dSyncFieldKey, N3dSyncChoice> | null>(
        null,
    );

    const loadPreview = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const result = await apiJson<{ preview: N3dSyncPreview }>(
                `/api/admin/products/${encodeURIComponent(slug)}/n3d-sync`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mode: "preview" }),
                },
            );
            setPreview(result.preview);
            setChoices(initialChoices(result.preview));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al cargar N3D.");
            setPreview(null);
            setChoices(null);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    function setChoice(key: N3dSyncFieldKey, value: N3dSyncChoice) {
        setChoices((prev) => (prev ? { ...prev, [key]: value } : prev));
    }

    function dismissPreview() {
        setPreview(null);
        setChoices(null);
        setError(null);
    }

    async function applySelection() {
        if (!choices) return;
        setError(null);
        setApplying(true);
        try {
            await apiJson(`/api/admin/products/${encodeURIComponent(slug)}/n3d-sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "apply", choices }),
            });
            dismissPreview();
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al aplicar.");
        } finally {
            setApplying(false);
        }
    }

    const changedCount = preview
        ? preview.rows.filter((r) => r.changed).length +
          (preview.filaments.changed ? 1 : 0) +
          (preview.image.oldUrl !== preview.image.newUrl &&
          (preview.image.oldUrl || preview.image.newUrl)
              ? 1
              : 0)
        : 0;

    const Wrapper = embedded ? "div" : "section";
    const wrapperClass = embedded
        ? "space-y-4"
        : "glass space-y-4 rounded-2xl border border-white/10 p-4 md:p-6";

    return (
        <Wrapper className={wrapperClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className={embedded ? "text-sm font-semibold text-zinc-200" : "text-lg font-semibold text-zinc-100"}>
                        {embedded ? "Sincronizar con N3D" : "Sync N3D"}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400">
                        Consulta la API de N3D Melbourne y elige campo a campo qué valor
                        conservar. Por defecto se usa el valor nuevo.
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                        Slug consultado:{" "}
                        <code className="text-zinc-400">{n3dSlug?.trim() || slug}</code>
                    </p>
                </div>
                {!preview && (
                    <div className="flex flex-col items-end gap-1.5">
                        <button
                            type="button"
                            onClick={() => void loadPreview()}
                            disabled={loading}
                            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:opacity-50"
                        >
                            {loading ? "Cargando N3D…" : "Sincronizar con N3D"}
                        </button>
                        <p className="text-right text-xs text-zinc-500">{n3dSyncedAtLabel}</p>
                    </div>
                )}
            </div>

            {preview && (
                <p className="text-xs text-zinc-500">{n3dSyncedAtLabel}</p>
            )}

            {error && (
                <p className="mt-4 text-sm text-red-300" role="alert">
                    {error}
                </p>
            )}

            {preview && choices && (
                <div className="mt-5 space-y-4">
                    <p className="text-sm text-zinc-400">
                        Diseño <code className="text-zinc-300">{preview.designSlug}</code>
                        {changedCount > 0 ? (
                            <> · {changedCount} diferencia(s)</>
                        ) : (
                            <> · sin diferencias respecto a la BD</>
                        )}
                    </p>

                    <N3dImageCompare
                        image={preview.image}
                        slug={slug}
                        choice={choices.n3dImage}
                        onChoice={(value) => setChoice("n3dImage", value)}
                    />

                    <N3dFilamentsCompare
                        filaments={preview.filaments}
                        slug={slug}
                        choice={choices.filaments}
                        onChoice={(value) => setChoice("filaments", value)}
                    />

                    <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 bg-black/30 text-xs uppercase tracking-wide text-zinc-500">
                                    <th className="px-3 py-2 font-medium">Campo</th>
                                    <th className="px-3 py-2 font-medium">Actual (BD)</th>
                                    <th className="px-3 py-2 font-medium">N3D</th>
                                    <th className="px-3 py-2 font-medium">Mantener</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.rows.map((row) => (
                                    <tr
                                        key={row.key}
                                        className={`border-b border-white/5 ${
                                            row.changed ? "bg-amber-500/5" : ""
                                        }`}
                                    >
                                        <td className="px-3 py-2 font-medium text-zinc-200">
                                            {row.label}
                                            {row.changed && (
                                                <span className="ml-1 text-amber-400/90">*</span>
                                            )}
                                        </td>
                                        <td className="max-w-[14rem] px-3 py-2 text-zinc-400">
                                            <span className="line-clamp-3 break-words">
                                                {row.oldDisplay}
                                            </span>
                                        </td>
                                        <td className="max-w-[14rem] px-3 py-2 text-zinc-300">
                                            <span className="line-clamp-3 break-words">
                                                {row.newDisplay}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-wrap gap-2">
                                                <label className="inline-flex cursor-pointer items-center gap-1 text-xs">
                                                    <input
                                                        type="radio"
                                                        name={`n3d-${row.key}`}
                                                        checked={choices[row.key] === "old"}
                                                        onChange={() => setChoice(row.key, "old")}
                                                        className="rounded-full"
                                                    />
                                                    <span className="text-zinc-400">Actual</span>
                                                </label>
                                                <label className="inline-flex cursor-pointer items-center gap-1 text-xs">
                                                    <input
                                                        type="radio"
                                                        name={`n3d-${row.key}`}
                                                        checked={choices[row.key] === "new"}
                                                        onChange={() => setChoice(row.key, "new")}
                                                        className="rounded-full"
                                                    />
                                                    <span className="text-sky-200">N3D</span>
                                                </label>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs text-zinc-600">
                        <span className="text-amber-400/90">*</span> Campo con diferencias.
                    </p>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void applySelection()}
                            disabled={applying}
                            className="rounded-lg bg-oak-600 px-4 py-2 text-sm font-medium text-white hover:bg-oak-500 disabled:opacity-50"
                        >
                            {applying ? "Aplicando…" : "Aplicar selección"}
                        </button>
                        <button
                            type="button"
                            onClick={() => void loadPreview()}
                            disabled={loading || applying}
                            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                        >
                            Actualizar preview
                        </button>
                        <button
                            type="button"
                            onClick={dismissPreview}
                            disabled={applying}
                            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </Wrapper>
    );
}
