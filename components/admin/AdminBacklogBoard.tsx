"use client";

import {
    BACKLOG_PRIORITY_LABEL,
    BACKLOG_SORT_LABEL,
    BACKLOG_STATUS_LABEL,
    type BacklogItem,
    type BacklogListQuery,
    type BacklogPriority,
    type BacklogSortField,
    type BacklogSortOrder,
    DEFAULT_BACKLOG_STATUS_FILTER,
    isDefaultBacklogStatusFilter,
    type BacklogStatus,
} from "@/lib/admin-backlog-types";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type BacklogCounts = Record<BacklogStatus, number>;

type AdminBacklogBoardProps = {
    initialItems: BacklogItem[];
    initialCounts: BacklogCounts;
    categories: string[];
    query: BacklogListQuery;
    updatedAt: string;
    total: number;
};

const STATUS_BADGE: Record<BacklogStatus, string> = {
    pending: "bg-amber-500/20 text-amber-100",
    in_progress: "bg-sky-500/20 text-sky-100",
    done: "bg-emerald-500/20 text-emerald-200",
    cancelled: "bg-zinc-500/20 text-zinc-400",
};

const PRIORITY_DOT: Record<BacklogPriority, string> = {
    high: "bg-red-400",
    medium: "bg-amber-400",
    low: "bg-zinc-500",
};

const inputClass =
    "w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100";

const selectClass =
    "rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-1.5 text-sm text-zinc-200";

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const payload = (await response.json()) as T & { error?: string };
    if (!response.ok) {
        throw new Error(payload.error || `Error ${response.status}`);
    }
    return payload;
}

function buildQueryString(query: BacklogListQuery): string {
    const params = new URLSearchParams();
    if (query.status === "all") {
        params.set("status", "all");
    } else if (query.status && !isDefaultBacklogStatusFilter(query.status)) {
        for (const status of query.status) {
            params.append("status", status);
        }
    }
    if (query.priority && query.priority !== "all") params.set("priority", query.priority);
    if (query.category && query.category !== "all") params.set("category", query.category);
    if (query.q) params.set("q", query.q);
    if (query.sort && query.sort !== "priority") params.set("sort", query.sort);
    if (query.order && query.order !== "asc") params.set("order", query.order);
    return params.toString();
}

export function AdminBacklogBoard({
    initialItems,
    initialCounts,
    categories,
    query,
    updatedAt,
    total,
}: AdminBacklogBoardProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [counts, setCounts] = useState(initialCounts);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("General");
    const [priority, setPriority] = useState<BacklogPriority>("medium");
    const [searchDraft, setSearchDraft] = useState(query.q ?? "");

    function effectiveStatusFilter(): BacklogStatus[] | "all" {
        const status = query.status;
        if (status === "all") return "all";
        if (!status || isDefaultBacklogStatusFilter(status)) return DEFAULT_BACKLOG_STATUS_FILTER;
        return status;
    }

    function isStatusFilterActive(value: "all" | BacklogStatus): boolean {
        if (value === "all") return query.status === "all";
        const current = effectiveStatusFilter();
        if (current === "all") return false;
        return current.includes(value);
    }

    function toggleStatusFilter(value: "all" | BacklogStatus) {
        if (value === "all") {
            patchQuery({ status: "all" });
            return;
        }

        const current = effectiveStatusFilter();
        if (current === "all") {
            patchQuery({ status: [value] });
            return;
        }

        const next = new Set(current);
        if (next.has(value)) {
            next.delete(value);
            patchQuery({
                status:
                    next.size === 0 ? DEFAULT_BACKLOG_STATUS_FILTER : Array.from(next),
            });
        } else {
            next.add(value);
            patchQuery({ status: Array.from(next) });
        }
    }
    const priorityFilter = query.priority ?? "all";
    const categoryFilter = query.category ?? "all";
    const sortField = query.sort ?? "priority";
    const sortOrder = query.order ?? "asc";

    function pushQuery(next: BacklogListQuery) {
        const qs = buildQueryString(next);
        router.push(qs ? `/admin/backlog?${qs}` : "/admin/backlog");
    }

    function patchQuery(patch: Partial<BacklogListQuery>) {
        pushQuery({ ...query, ...patch });
    }

    async function refreshFromServer() {
        router.refresh();
    }

    async function patchItem(id: string, patch: Partial<BacklogItem>) {
        setError(null);
        setLoadingId(id);
        try {
            const result = await apiJson<{ item: BacklogItem; counts: BacklogCounts }>(
                `/api/admin/backlog/${id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(patch),
                },
            );
            setCounts(result.counts);
            await refreshFromServer();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al actualizar.");
        } finally {
            setLoadingId(null);
        }
    }

    async function removeItem(id: string) {
        if (!window.confirm("Eliminar esta tarea del backlog?")) return;
        setError(null);
        setLoadingId(id);
        try {
            const result = await apiJson<{ counts: BacklogCounts }>(`/api/admin/backlog/${id}`, {
                method: "DELETE",
            });
            setCounts(result.counts);
            await refreshFromServer();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar.");
        } finally {
            setLoadingId(null);
        }
    }

    async function addItem(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoadingId("new");
        try {
            const result = await apiJson<{ item: BacklogItem; counts: BacklogCounts }>(
                "/api/admin/backlog",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, description, category, priority }),
                },
            );
            setCounts(result.counts);
            setTitle("");
            setDescription("");
            setCategory("General");
            setPriority("medium");
            setShowForm(false);
            await refreshFromServer();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al crear.");
        } finally {
            setLoadingId(null);
        }
    }

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        patchQuery({ q: searchDraft.trim() || undefined });
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-4">
                {(
                    [
                        ["pending", counts.pending],
                        ["in_progress", counts.in_progress],
                        ["done", counts.done],
                        ["cancelled", counts.cancelled],
                    ] as const
                ).map(([status, count]) => (
                    <div
                        key={status}
                        className="glass rounded-xl border border-white/10 px-4 py-3 text-center"
                    >
                        <div className="text-2xl font-bold text-zinc-100">{count}</div>
                        <div className="text-xs text-zinc-500">{BACKLOG_STATUS_LABEL[status]}</div>
                    </div>
                ))}
            </div>

            <div className="glass space-y-3 rounded-2xl border border-white/10 p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Estado
                    </span>
                    {(
                        [
                            ["all", "Todas"],
                            ["pending", "Pendientes"],
                            ["in_progress", "En curso"],
                            ["done", "Hecho"],
                            ["cancelled", "Canceladas"],
                        ] as const
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => toggleStatusFilter(value)}
                            className={`rounded-lg px-3 py-1.5 text-sm transition ${
                                isStatusFilterActive(value)
                                    ? "bg-oak-600 text-white"
                                    : "border border-white/10 text-zinc-400 hover:bg-white/5"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="backlog-priority" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Prioridad
                    </label>
                    <select
                        id="backlog-priority"
                        value={priorityFilter}
                        onChange={(e) =>
                            patchQuery({
                                priority: e.target.value as BacklogPriority | "all",
                            })
                        }
                        className={selectClass}
                    >
                        <option value="all">Todas</option>
                        {(Object.keys(BACKLOG_PRIORITY_LABEL) as BacklogPriority[]).map((p) => (
                            <option key={p} value={p}>
                                {BACKLOG_PRIORITY_LABEL[p]}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="backlog-category" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Categoría
                    </label>
                    <select
                        id="backlog-category"
                        value={categoryFilter}
                        onChange={(e) => patchQuery({ category: e.target.value })}
                        className={selectClass}
                    >
                        <option value="all">Todas</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="backlog-sort" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Ordenar
                    </label>
                    <select
                        id="backlog-sort"
                        value={sortField}
                        onChange={(e) =>
                            patchQuery({ sort: e.target.value as BacklogSortField })
                        }
                        className={selectClass}
                    >
                        {(Object.keys(BACKLOG_SORT_LABEL) as BacklogSortField[]).map((field) => (
                            <option key={field} value={field}>
                                {BACKLOG_SORT_LABEL[field]}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label="Dirección de ordenación"
                        value={sortOrder}
                        onChange={(e) =>
                            patchQuery({ order: e.target.value as BacklogSortOrder })
                        }
                        className={selectClass}
                    >
                        <option value="asc">Ascendente</option>
                        <option value="desc">Descendente</option>
                    </select>
                </div>

                <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-2">
                    <input
                        type="search"
                        value={searchDraft}
                        onChange={(e) => setSearchDraft(e.target.value)}
                        placeholder="Buscar título, descripción, id…"
                        className="min-w-[12rem] flex-1 rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-1.5 text-sm text-zinc-100 sm:max-w-sm"
                        aria-label="Buscar en backlog"
                    />
                    <button
                        type="submit"
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/5"
                    >
                        Buscar
                    </button>
                    {(query.q || searchParams.toString()) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchDraft("");
                                pushQuery({
                                    status: DEFAULT_BACKLOG_STATUS_FILTER,
                                    priority: "all",
                                    category: "all",
                                    sort: "priority",
                                    order: "asc",
                                });
                            }}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5"
                        >
                            Limpiar filtros
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowForm((v) => !v)}
                        className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/5"
                    >
                        {showForm ? "Cancelar" : "+ Nueva tarea"}
                    </button>
                </form>
            </div>

            {showForm && (
                <form
                    onSubmit={(e) => void addItem(e)}
                    className="glass space-y-3 rounded-2xl border border-white/10 p-4 md:p-5"
                >
                    <h3 className="text-sm font-semibold text-zinc-200">Nueva tarea</h3>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Titulo"
                        required
                        className={inputClass}
                    />
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descripcion (opcional)"
                        rows={2}
                        className={inputClass}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <input
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Categoria"
                            className={inputClass}
                        />
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as BacklogPriority)}
                            className={inputClass}
                        >
                            {(Object.keys(BACKLOG_PRIORITY_LABEL) as BacklogPriority[]).map((p) => (
                                <option key={p} value={p}>
                                    Prioridad {BACKLOG_PRIORITY_LABEL[p]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={loadingId === "new"}
                        className="rounded-lg bg-oak-600 px-4 py-2 text-sm font-medium text-white hover:bg-oak-500 disabled:opacity-50"
                    >
                        {loadingId === "new" ? "Guardando…" : "Añadir al backlog"}
                    </button>
                </form>
            )}

            {error && (
                <p className="text-sm text-red-300" role="alert">
                    {error}
                </p>
            )}

            <p className="text-xs text-zinc-500">
                Mostrando {initialItems.length} de {total} tareas
            </p>

            <div className="space-y-3">
                {initialItems.length === 0 ? (
                    <p className="text-sm text-zinc-500">No hay tareas con estos filtros.</p>
                ) : (
                    initialItems.map((item) => (
                        <article
                            key={item.id}
                            className="glass rounded-xl border border-white/10 p-4 md:p-5"
                        >
                            <div className="flex flex-wrap items-start gap-2">
                                <span
                                    className={`h-2.5 w-2.5 mt-1.5 shrink-0 rounded-full ${PRIORITY_DOT[item.priority]}`}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-medium text-zinc-100">{item.title}</h3>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[item.status]}`}
                                        >
                                            {BACKLOG_STATUS_LABEL[item.status]}
                                        </span>
                                        <span className="text-xs text-zinc-500">{item.category}</span>
                                    </div>
                                    {item.description && (
                                        <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {item.status !== "in_progress" && item.status !== "done" && (
                                    <button
                                        type="button"
                                        disabled={loadingId === item.id}
                                        onClick={() => void patchItem(item.id, { status: "in_progress" })}
                                        className="rounded-lg bg-sky-600/90 px-3 py-1 text-xs text-white hover:bg-sky-500 disabled:opacity-50"
                                    >
                                        En curso
                                    </button>
                                )}
                                {item.status !== "done" && (
                                    <button
                                        type="button"
                                        disabled={loadingId === item.id}
                                        onClick={() => void patchItem(item.id, { status: "done" })}
                                        className="rounded-lg bg-emerald-700/90 px-3 py-1 text-xs text-white hover:bg-emerald-600 disabled:opacity-50"
                                    >
                                        Hecho
                                    </button>
                                )}
                                {item.status !== "pending" && item.status !== "cancelled" && (
                                    <button
                                        type="button"
                                        disabled={loadingId === item.id}
                                        onClick={() => void patchItem(item.id, { status: "pending" })}
                                        className="rounded-lg border border-white/15 px-3 py-1 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                                    >
                                        Pendiente
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={loadingId === item.id}
                                    onClick={() => void removeItem(item.id)}
                                    className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </article>
                    ))
                )}
            </div>

            <p className="text-xs text-zinc-600">
                Actualizado {new Date(updatedAt).toLocaleString("es-ES")} · Postgres{" "}
                <code className="text-zinc-500">backlog_tasks</code>
            </p>
        </div>
    );
}
