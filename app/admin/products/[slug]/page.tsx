import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminCollapsibleSection } from "@/components/admin/AdminCollapsibleSection";
import { AdminProductActions } from "@/components/admin/AdminProductActions";
import { AdminProductEditForm } from "@/components/admin/AdminProductEditForm";
import { ProductImagesPanel } from "@/components/admin/ProductImagesPanel";
import { formatN3dSyncedAtLabel } from "@/lib/n3d-sync-timestamp";
import { getProductWithImagesBySlug } from "@/lib/admin-images";
import {
    archiveAdminProduct,
    duplicateAdminProduct,
    unarchiveAdminProduct,
} from "@/lib/admin-product-lifecycle";
import { parseProductFormData, updateAdminProduct } from "@/lib/admin-product-update";
import { normalizeProductSlug, suggestDuplicateSlug } from "@/lib/admin-product-slug";
import { buildReferenceImageSearchQuery } from "@/lib/image-search-query";

export const dynamic = "force-dynamic";

interface PageProps {
    params: { slug: string };
    searchParams?: { saved?: string; created?: string; duplicated?: string; archived?: string; restored?: string; error?: string };
}

async function saveProduct(formData: FormData) {
    "use server";

    const slug = String(formData.get("slug") || "");
    let input;
    try {
        input = parseProductFormData(formData);
        await updateAdminProduct(input);
    } catch (error) {
        const message = error instanceof Error ? error.message : "error";
        redirect(`/admin/products/${slug}?error=${encodeURIComponent(message)}`);
    }

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${slug}`);
    redirect(`/admin/products/${slug}?saved=1`);
}

async function duplicateProduct(formData: FormData) {
    "use server";

    const sourceId = String(formData.get("sourceId") || "");
    const newSlugRaw = String(formData.get("newSlug") || "");
    const copyImages = formData.get("copyImages") === "on";

    try {
        const product = await duplicateAdminProduct({
            sourceProductId: sourceId,
            newSlug: normalizeProductSlug(newSlugRaw),
            copyImages,
        });
        revalidatePath("/admin/products");
        redirect(`/admin/products/${product.slug}?duplicated=1`);
    } catch (error) {
        const slug = String(formData.get("slug") || "");
        const message = error instanceof Error ? error.message : "error";
        redirect(`/admin/products/${slug}?error=${encodeURIComponent(message)}`);
    }
}

async function archiveProduct(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    const slug = String(formData.get("slug") || "");

    try {
        await archiveAdminProduct(id);
        revalidatePath("/admin/products");
        redirect(`/admin/products/${slug}?archived=1`);
    } catch (error) {
        const message = error instanceof Error ? error.message : "error";
        redirect(`/admin/products/${slug}?error=${encodeURIComponent(message)}`);
    }
}

async function restoreProduct(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    const slug = String(formData.get("slug") || "");

    try {
        await unarchiveAdminProduct(id);
        revalidatePath("/admin/products");
        redirect(`/admin/products/${slug}?restored=1`);
    } catch (error) {
        const message = error instanceof Error ? error.message : "error";
        redirect(`/admin/products/${slug}?error=${encodeURIComponent(message)}`);
    }
}

function isProductNotFoundError(error: unknown): boolean {
    return (
        error instanceof Error &&
        error.message.includes("no encontrado en base de datos")
    );
}

export default async function AdminProductDetailPage({ params, searchParams }: PageProps) {
    let product: Awaited<ReturnType<typeof getProductWithImagesBySlug>> | null = null;
    let loadError: string | null = null;

    try {
        product = await getProductWithImagesBySlug(params.slug);
    } catch (error) {
        if (isProductNotFoundError(error)) {
            notFound();
        }
        loadError =
            error instanceof Error
                ? error.message
                : "No se pudo cargar el producto.";
    }

    if (loadError || !product) {
        return (
            <div className="container mx-auto max-w-6xl px-4 py-12">
                <Link href="/admin/products" className="text-sm text-zinc-400 hover:text-white">
                    ← Volver al listado
                </Link>
                <h1 className="mt-4 text-2xl font-bold text-red-200">Error al cargar {params.slug}</h1>
                <p className="mt-2 text-sm text-zinc-400">{loadError}</p>
                <p className="mt-4 text-sm text-zinc-500">
                    Comprueba que el slug existe en Postgres (Supabase) y que{" "}
                    <code className="text-zinc-300">DATABASE_URL</code> es correcto.
                </p>
            </div>
        );
    }

    return (
        <div className="py-8 md:py-12">
            <div className="container mx-auto max-w-6xl px-4 md:px-6">
                <div className="mb-6">
                    <Link
                        href="/admin/products"
                        className="text-sm text-zinc-400 transition hover:text-white"
                    >
                        ← Volver al listado
                    </Link>
                    <h1 className="mt-2 font-display text-3xl font-bold">{product.name}</h1>
                    <p className="text-zinc-500">{product.slug}</p>
                </div>

                {searchParams?.saved === "1" && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                        Cambios guardados correctamente.
                    </div>
                )}
                {searchParams?.created === "1" && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                        Producto creado.
                    </div>
                )}
                {searchParams?.duplicated === "1" && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                        Copia creada correctamente.
                    </div>
                )}
                {searchParams?.archived === "1" && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                        Producto archivado (ya no visible en catalogo).
                    </div>
                )}
                {searchParams?.restored === "1" && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                        Producto restaurado a borrador.
                    </div>
                )}
                {searchParams?.error && (
                        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                            {decodeURIComponent(searchParams.error)}
                        </div>
                    )}

                <div className="space-y-6">
                    <AdminProductActions
                        productId={product.id}
                        slug={product.slug}
                        n3dSlug={product.n3dSlug}
                        n3dSyncedAtLabel={formatN3dSyncedAtLabel(product.n3dSyncedAt)}
                        status={product.status}
                        suggestedDuplicateSlug={await suggestDuplicateSlug(product.slug)}
                        duplicateAction={duplicateProduct}
                        archiveAction={archiveProduct}
                        restoreAction={restoreProduct}
                    />

                    <AdminCollapsibleSection
                        title="Imágenes"
                        subtitle="Referencias, subidas y generación IA"
                    >
                        <ProductImagesPanel
                            bare
                            productId={product.id}
                            slug={product.slug}
                            images={product.images}
                            defaultSearchQuery={buildReferenceImageSearchQuery({
                                name: product.name,
                                slug: product.slug,
                                pokemonName: product.pokemonName,
                            })}
                        />
                    </AdminCollapsibleSection>

                    <AdminCollapsibleSection title="Datos generales" subtitle="Nombre, precio, catálogo, Pokémon">
                        <AdminProductEditForm bare product={product} action={saveProduct} />
                    </AdminCollapsibleSection>
                </div>
            </div>
        </div>
    );
}
