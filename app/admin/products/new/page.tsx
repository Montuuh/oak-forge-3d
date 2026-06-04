import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminProductCreateForm } from "@/components/admin/AdminProductCreateForm";
import { createAdminProduct } from "@/lib/admin-product-lifecycle";
import { normalizeProductSlug } from "@/lib/admin-product-slug";

export const dynamic = "force-dynamic";

async function createProduct(formData: FormData) {
    "use server";

    try {
        const product = await createAdminProduct({
            slug: normalizeProductSlug(String(formData.get("slug") || "")),
            name: String(formData.get("name") || "").trim(),
            category: String(formData.get("category") || "character").trim(),
            n3dSlug: String(formData.get("n3dSlug") || "").trim() || null,
        });
        revalidatePath("/admin/products");
        redirect(`/admin/products/${product.slug}?created=1`);
    } catch (error) {
        const message = error instanceof Error ? error.message : "error";
        redirect(`/admin/products/new?error=${encodeURIComponent(message)}`);
    }
}

interface PageProps {
    searchParams?: { error?: string };
}

export default function AdminProductNewPage({ searchParams }: PageProps) {
    return (
        <div className="py-8 md:py-12">
            <div className="container mx-auto max-w-2xl px-4 md:px-6">
                <Link href="/admin/products" className="text-sm text-zinc-400 hover:text-white">
                    ← Productos
                </Link>
                <h1 className="mt-2 font-display text-3xl font-bold">Nuevo producto</h1>
                <p className="mt-2 text-sm text-zinc-400">
                    Crea un registro vacio en borrador. Completa datos, N3D o imagenes en la ficha.
                </p>

                {searchParams?.error && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                        {decodeURIComponent(searchParams.error)}
                    </div>
                )}

                <div className="mt-6">
                    <AdminProductCreateForm action={createProduct} />
                </div>
            </div>
        </div>
    );
}
