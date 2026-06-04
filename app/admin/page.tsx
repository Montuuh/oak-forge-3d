import Link from "next/link";
import { countBacklogByStatus, listBacklogItems } from "@/lib/admin-backlog";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const [pendingAll, counts] = await Promise.all([
        listBacklogItems({ status: ["pending"], sort: "priority", order: "asc" }),
        countBacklogByStatus(),
    ]);
    const pending = pendingAll.slice(0, 5);

    return (
        <div className="min-h-screen py-10 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="glass rounded-2xl p-6 md:p-8">
                        <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">
                            Admin Console
                        </h1>
                        <p className="text-zinc-400">
                            Gestiona productos, referencias N3D/locales, candidatos AI y visibilidad
                            del catalogo publico. En produccion el sitio lee productos visibles desde
                            la base de datos.
                        </p>
                    </div>

                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Prioridad inmediata</h2>
                        <p className="mb-4 text-sm text-zinc-300">
                            Imágenes AI <strong className="text-zinc-200">v7</strong> producto a producto.
                            Siguiente hito infra: sync N3D → BD + Storage.
                        </p>
                        {pending.length > 0 ? (
                            <ul className="mb-4 space-y-2 text-sm">
                                {pending.map((item) => (
                                    <li
                                        key={item.id}
                                        className="flex items-center gap-2 text-zinc-300"
                                    >
                                        <span className="text-amber-400/80">○</span>
                                        {item.title}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mb-4 text-sm text-zinc-500">Sin tareas pendientes.</p>
                        )}
                        <Link
                            href="/admin/backlog"
                            className="text-sm text-sky-300 hover:text-sky-200"
                        >
                            Ver backlog ({counts.pending} pendientes) →
                        </Link>
                    </div>

                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Acciones</h2>
                        <div className="flex flex-wrap items-start gap-3">
                            <Link
                                href="/admin/products"
                                className="rounded-xl bg-oak-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-oak-500"
                            >
                                Gestionar productos
                            </Link>
                            <Link
                                href="/admin/n3d-sync"
                                className="rounded-xl border border-sky-500/40 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/10"
                            >
                                Sync N3D masivo
                            </Link>
                            <Link
                                href="/admin/backlog"
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                            >
                                Backlog
                            </Link>
                        </div>
                    </div>

                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                        >
                            Volver al sitio publico
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
