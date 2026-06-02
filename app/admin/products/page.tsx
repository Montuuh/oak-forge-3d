import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { ProductStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PRODUCT_STATES: ProductStatus[] = ["draft", "in_review", "published", "archived"];

async function updateProduct(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    const status = String(formData.get("status") || "draft") as ProductStatus;
    const category = String(formData.get("category") || "character");
    const shortDescription = String(formData.get("shortDescription") || "").trim();
    const priceRaw = String(formData.get("priceCents") || "").trim();
    const wantsVisibleInCatalog = formData.get("isVisibleInCatalog") === "on";

    if (!id) return;
    if (!PRODUCT_STATES.includes(status)) return;

    if (wantsVisibleInCatalog) {
        const approvedCount = await db.productImage.count({
            where: { productId: id, status: "approved" },
        });
        if (approvedCount === 0) {
            redirect("/admin/products?error=visibility_requires_image");
        }
    }

    await db.product.update({
        where: { id },
        data: {
            status,
            category,
            isVisibleInCatalog: wantsVisibleInCatalog,
            shortDescription: shortDescription || null,
            priceCents: priceRaw ? Number(priceRaw) : null,
        },
    });

    revalidatePath("/admin/products");
    redirect("/admin/products?saved=1");
}

interface AdminProductsPageProps {
    searchParams?: { error?: string; saved?: string };
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
    let products: Awaited<ReturnType<typeof db.product.findMany>> = [];
    let loadError: string | null = null;

    try {
        products = await db.product.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
        });
    } catch (error) {
        loadError =
            error instanceof Error
                ? error.message
                : "No se pudo cargar productos. Revisa DATABASE_URL y prisma db push.";
    }

    return (
        <div className="py-8 md:py-12">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-3xl font-bold">Productos</h1>
                        <p className="text-zinc-400">
                            Marca &quot;Visible en catalogo&quot; solo cuando el producto tenga imagen aprobada.
                            El sitio publico usa <code className="text-zinc-300">npm run catalog:export</code>.
                        </p>
                    </div>
                </div>

                {searchParams?.error === "visibility_requires_image" && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                        No se puede activar visibilidad publica sin al menos una imagen aprobada.
                    </div>
                )}
                {searchParams?.saved === "1" && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                        Cambios guardados.
                    </div>
                )}

                {loadError ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                        {loadError}
                    </div>
                ) : products.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                        No hay productos en la base de datos todavia.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {products.map((product) => (
                            <form
                                key={product.id}
                                action={updateProduct}
                                className="glass rounded-2xl border border-white/10 p-4"
                            >
                                <input type="hidden" name="id" value={product.id} />

                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <div className="font-semibold">{product.name}</div>
                                        <div className="text-xs text-zinc-500">
                                            slug: {product.slug}
                                        </div>
                                    </div>
                                    <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                                        <input
                                            type="checkbox"
                                            name="isVisibleInCatalog"
                                            defaultChecked={product.isVisibleInCatalog}
                                        />
                                        Visible en catalogo publico
                                    </label>
                                </div>

                                <div className="grid gap-3 md:grid-cols-4">
                                    <label className="text-sm">
                                        <span className="mb-1 block text-zinc-400">Estado</span>
                                        <select
                                            name="status"
                                            defaultValue={product.status}
                                            className="w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2"
                                        >
                                            {PRODUCT_STATES.map((state) => (
                                                <option key={state} value={state}>
                                                    {state}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="text-sm">
                                        <span className="mb-1 block text-zinc-400">Categoria</span>
                                        <input
                                            name="category"
                                            defaultValue={product.category}
                                            className="w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2"
                                        />
                                    </label>

                                    <label className="text-sm">
                                        <span className="mb-1 block text-zinc-400">Precio (centimos)</span>
                                        <input
                                            type="number"
                                            name="priceCents"
                                            defaultValue={product.priceCents ?? ""}
                                            className="w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2"
                                        />
                                    </label>

                                    <label className="text-sm md:col-span-1">
                                        <span className="mb-1 block text-zinc-400">Descripcion corta</span>
                                        <input
                                            name="shortDescription"
                                            defaultValue={product.shortDescription ?? ""}
                                            className="w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2"
                                        />
                                    </label>
                                </div>

                                <div className="mt-3">
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-oak-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-oak-500"
                                    >
                                        Guardar cambios
                                    </button>
                                </div>
                            </form>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
