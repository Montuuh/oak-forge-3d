import Link from "next/link";
import { Suspense } from "react";
import { AdminBacklogBoard } from "@/components/admin/AdminBacklogBoard";
import {
    countBacklogByStatus,
    getBacklogMeta,
    listBacklogCategories,
    listBacklogItems,
    parseBacklogListQuery,
} from "@/lib/admin-backlog";

export const dynamic = "force-dynamic";

type PageProps = {
    searchParams: Record<string, string | string[] | undefined>;
};

export default async function AdminBacklogPage({ searchParams }: PageProps) {
    const query = parseBacklogListQuery(searchParams);
    const [items, counts, categories, meta] = await Promise.all([
        listBacklogItems(query),
        countBacklogByStatus(),
        listBacklogCategories(),
        getBacklogMeta(),
    ]);

    return (
        <div className="py-8 md:py-12">
            <div className="container mx-auto max-w-3xl px-4 md:px-6">
                <div className="mb-6">
                    <Link href="/admin" className="text-sm text-zinc-400 hover:text-white">
                        ← Admin
                    </Link>
                    <h1 className="mt-2 font-display text-3xl font-bold">Backlog</h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        Prioridades del producto en Postgres (Supabase). Filtra por estado,
                        prioridad y categoría; editable en producción.
                    </p>
                </div>

                <Suspense fallback={<p className="text-sm text-zinc-500">Cargando backlog…</p>}>
                    <AdminBacklogBoard
                        initialItems={items}
                        initialCounts={counts}
                        categories={categories}
                        query={query}
                        updatedAt={meta.updatedAt}
                        total={meta.total}
                    />
                </Suspense>
            </div>
        </div>
    );
}
