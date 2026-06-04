"use client";

import { AdminN3dSyncPanel } from "@/components/admin/AdminN3dSyncPanel";
import { useState } from "react";

const fieldClass =
    "w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100";

type AdminProductActionsProps = {
    productId: string;
    slug: string;
    n3dSlug: string | null;
    n3dSyncedAtLabel: string;
    status: string;
    suggestedDuplicateSlug: string;
    duplicateAction: (formData: FormData) => Promise<void>;
    archiveAction: (formData: FormData) => Promise<void>;
    restoreAction: (formData: FormData) => Promise<void>;
};

export function AdminProductActions({
    productId,
    slug,
    n3dSlug,
    n3dSyncedAtLabel,
    status,
    suggestedDuplicateSlug,
    duplicateAction,
    archiveAction,
    restoreAction,
}: AdminProductActionsProps) {
    const [showDuplicate, setShowDuplicate] = useState(false);
    const isArchived = status === "archived";

    return (
        <section className="glass rounded-2xl border border-white/10 p-4 md:p-6">
            <h2 className="text-lg font-semibold text-zinc-100">Acciones</h2>
            <p className="mt-1 text-sm text-zinc-500">
                Sincronizar con N3D, duplicar o archivar. El catalogo publico solo muestra productos
                visibles y no archivados.
            </p>

            <div className="mt-5 border-t border-white/10 pt-5">
                <AdminN3dSyncPanel
                    embedded
                    slug={slug}
                    n3dSlug={n3dSlug}
                    n3dSyncedAtLabel={n3dSyncedAtLabel}
                />
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-5">
                <button
                    type="button"
                    onClick={() => setShowDuplicate((v) => !v)}
                    className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
                >
                    {showDuplicate ? "Cerrar duplicar" : "Duplicar producto"}
                </button>

                {isArchived ? (
                    <form action={restoreAction} className="inline">
                        <input type="hidden" name="id" value={productId} />
                        <input type="hidden" name="slug" value={slug} />
                        <button
                            type="submit"
                            className="rounded-lg border border-emerald-500/40 px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/10"
                        >
                            Restaurar (borrador)
                        </button>
                    </form>
                ) : (
                    <form
                        action={archiveAction}
                        className="inline"
                        onSubmit={(e) => {
                            if (
                                !window.confirm(
                                    `¿Archivar "${slug}"? Dejara de ser visible en el catalogo.`,
                                )
                            ) {
                                e.preventDefault();
                            }
                        }}
                    >
                        <input type="hidden" name="id" value={productId} />
                        <input type="hidden" name="slug" value={slug} />
                        <button
                            type="submit"
                            className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/10"
                        >
                            Archivar
                        </button>
                    </form>
                )}
            </div>

            {showDuplicate && (
                <form
                    action={duplicateAction}
                    className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4"
                >
                    <input type="hidden" name="sourceId" value={productId} />
                    <input type="hidden" name="slug" value={slug} />
                    <label className="block text-sm">
                        <span className="mb-1 block text-zinc-400">Slug del nuevo producto</span>
                        <input
                            name="newSlug"
                            defaultValue={suggestedDuplicateSlug}
                            required
                            className={fieldClass}
                            pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                        <input type="checkbox" name="copyImages" defaultChecked className="rounded" />
                        Copiar imagenes en Storage
                    </label>
                    <p className="text-xs text-zinc-500">
                        El N3D slug no se copia (evita conflictos). Las imagenes AI pasan a candidato.
                    </p>
                    <button
                        type="submit"
                        className="rounded-lg bg-oak-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-oak-500"
                    >
                        Crear copia
                    </button>
                </form>
            )}
        </section>
    );
}
