import Link from "next/link";
import { Suspense } from "react";
import { AdminCatalogExport } from "@/components/admin/AdminCatalogExport";
import { AdminProductFilters } from "@/components/admin/AdminProductFilters";
import {
    getImageStatusSummary,
    listAdminProducts,
    parseFiltersFromSearchParams,
    type AdminProductListResult,
} from "@/lib/admin-product-queries";
import { getPilotSlugs } from "@/lib/ai-image-queue-file";

export const dynamic = "force-dynamic";

const IMAGE_LABEL = {
    approved: "AI aprobada",
    candidates: "Candidatos",
    none: "Sin AI",
    rejected_only: "Solo rechazadas",
} as const;

const STATUS_BADGE: Record<string, string> = {
    draft: "bg-zinc-500/20 text-zinc-300",
    in_review: "bg-amber-500/20 text-amber-100",
    published: "bg-emerald-500/20 text-emerald-200",
    archived: "bg-red-500/20 text-red-200",
};

function buildListQuery(
    filters: ReturnType<typeof parseFiltersFromSearchParams>,
    overrides: Record<string, string | number>,
): string {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.category) params.set("category", filters.category);
    if (filters.visibility) params.set("visibility", filters.visibility);
    if (filters.image) params.set("image", filters.image);
    if (filters.pilot) params.set("pilot", filters.pilot);
    if (filters.featured) params.set("featured", filters.featured);
    if (filters.available) params.set("available", filters.available);
    Object.entries(overrides).forEach(([k, v]) => params.set(k, String(v)));
    const s = params.toString();
    return s ? `?${s}` : "";
}

interface AdminProductsPageProps {
    searchParams?: Record<string, string | string[] | undefined>;
}

export default async function AdminProductsPage({ searchParams = {} }: AdminProductsPageProps) {
    const filters = parseFiltersFromSearchParams(searchParams);
    const pilotSlugs = new Set(getPilotSlugs());

    let result: AdminProductListResult | null = null;
    let loadError: string | null = null;

    try {
        result = await listAdminProducts(filters);
    } catch (error) {
        loadError =
            error instanceof Error
                ? error.message
                : "No se pudo cargar productos. Revisa DATABASE_URL.";
    }

    const flash = typeof searchParams.saved === "string" ? "saved" : null;
    const flashError =
        typeof searchParams.error === "string" ? searchParams.error : null;

    return (
        <div className="py-8 md:py-12">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mb-6 max-w-3xl">
                    <h1 className="font-display text-3xl font-bold">Productos</h1>
                    <p className="mt-2 text-zinc-400">
                        Selecciona un producto para editar datos, imagenes AI y visibilidad. El sitio
                        en Vercel muestra productos visibles desde la BD; exporta JSON para respaldo
                        o commit.
                    </p>
                    <div className="mt-4">
                        <AdminCatalogExport />
                    </div>
                </div>

                {flash === "saved" && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                        Cambios guardados.
                    </div>
                )}

                <div className="mb-6">
                    <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-white/5" />}>
                        <AdminProductFilters />
                    </Suspense>
                </div>

                {loadError ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                        {loadError}
                    </div>
                ) : !result || result.items.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                        No hay productos con estos filtros.
                    </div>
                ) : (
                    <>
                        <p className="mb-3 text-sm text-zinc-500">
                            {result.total} producto(s) · pagina {result.page} de {result.totalPages}
                        </p>

                        <div className="overflow-hidden rounded-2xl border border-white/10">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 text-zinc-400">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Producto</th>
                                        <th className="hidden px-4 py-3 font-medium md:table-cell">Estado</th>
                                        <th className="hidden px-4 py-3 font-medium sm:table-cell">Imagen</th>
                                        <th className="px-4 py-3 font-medium">Publico</th>
                                        <th className="px-4 py-3 font-medium" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {result.items.map((product) => {
                                        const imageSummary = getImageStatusSummary(product.images);
                                        return (
                                            <tr
                                                key={product.id}
                                                className="transition hover:bg-white/[0.03]"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-zinc-100">
                                                        {product.name}
                                                    </div>
                                                    <div className="text-xs text-zinc-500">
                                                        {product.slug}
                                                        {pilotSlugs.has(product.slug) && (
                                                            <span className="ml-2 text-violet-300">
                                                                piloto
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="hidden px-4 py-3 md:table-cell">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[product.status] ?? ""}`}
                                                    >
                                                        {product.status}
                                                    </span>
                                                </td>
                                                <td className="hidden px-4 py-3 text-zinc-400 sm:table-cell">
                                                    {IMAGE_LABEL[imageSummary]}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {product.isVisibleInCatalog ? (
                                                        <span className="text-emerald-300">Si</span>
                                                    ) : (
                                                        <span className="text-zinc-500">No</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link
                                                        href={`/admin/products/${product.slug}`}
                                                        className="rounded-lg bg-oak-600/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-oak-500"
                                                    >
                                                        Editar
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {result.totalPages > 1 && (
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                {result.page > 1 && (
                                    <Link
                                        href={`/admin/products${buildListQuery(filters, { page: result.page - 1 })}`}
                                        className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
                                    >
                                        Anterior
                                    </Link>
                                )}
                                <span className="text-sm text-zinc-500">
                                    {result.page} / {result.totalPages}
                                </span>
                                {result.page < result.totalPages && (
                                    <Link
                                        href={`/admin/products${buildListQuery(filters, { page: result.page + 1 })}`}
                                        className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
                                    >
                                        Siguiente
                                    </Link>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
