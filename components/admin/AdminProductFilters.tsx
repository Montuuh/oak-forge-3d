"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PRODUCT_STATUS_OPTIONS } from "@/lib/admin-product-constants";
import type { FormEvent } from "react";

const inputClass =
    "w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100";

export function AdminProductFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const params = new URLSearchParams();
        form.forEach((value, key) => {
            const v = String(value).trim();
            if (v) params.set(key, v);
        });
        router.push(`/admin/products?${params.toString()}`);
    }

    function clearFilters() {
        router.push("/admin/products");
    }

    const val = (key: string) => searchParams.get(key) ?? "";

    return (
        <form onSubmit={onSubmit} className="glass rounded-2xl border border-white/10 p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-zinc-200">Filtros</h2>
                <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-zinc-400 transition hover:text-white"
                >
                    Limpiar filtros
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm sm:col-span-2 lg:col-span-2">
                    <span className="mb-1 block text-zinc-400">Buscar (nombre, slug, Pokemon)</span>
                    <input
                        name="q"
                        defaultValue={val("q")}
                        placeholder="ej. charizard"
                        className={inputClass}
                    />
                </label>

                <label className="text-sm">
                    <span className="mb-1 block text-zinc-400">Estado</span>
                    <select name="status" defaultValue={val("status")} className={inputClass}>
                        <option value="">Todos</option>
                        {PRODUCT_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="text-sm">
                    <span className="mb-1 block text-zinc-400">Categoria</span>
                    <select name="category" defaultValue={val("category")} className={inputClass}>
                        <option value="">Todas</option>
                        <option value="character">character</option>
                        <option value="standard">standard</option>
                    </select>
                </label>

                <label className="text-sm">
                    <span className="mb-1 block text-zinc-400">Catalogo publico</span>
                    <select name="visibility" defaultValue={val("visibility")} className={inputClass}>
                        <option value="">Todos</option>
                        <option value="visible">Visible</option>
                        <option value="hidden">Oculto</option>
                    </select>
                </label>

                <label className="text-sm">
                    <span className="mb-1 block text-zinc-400">Imagen AI</span>
                    <select name="image" defaultValue={val("image")} className={inputClass}>
                        <option value="">Todas</option>
                        <option value="needs_review">Pendiente de revision</option>
                        <option value="has_candidates">Con candidatos</option>
                        <option value="approved">Con imagen aprobada</option>
                        <option value="no_ai">Sin imagen AI</option>
                    </select>
                </label>

                <label className="text-sm">
                    <span className="mb-1 block text-zinc-400">Destacado</span>
                    <select name="featured" defaultValue={val("featured")} className={inputClass}>
                        <option value="">Todos</option>
                        <option value="1">Si</option>
                        <option value="0">No</option>
                    </select>
                </label>

                <label className="text-sm">
                    <span className="mb-1 block text-zinc-400">Disponible</span>
                    <select name="available" defaultValue={val("available")} className={inputClass}>
                        <option value="">Todos</option>
                        <option value="1">Si</option>
                        <option value="0">No</option>
                    </select>
                </label>
            </div>

            <div className="mt-4">
                <button
                    type="submit"
                    className="rounded-lg bg-oak-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-oak-500"
                >
                    Aplicar filtros
                </button>
            </div>
        </form>
    );
}
