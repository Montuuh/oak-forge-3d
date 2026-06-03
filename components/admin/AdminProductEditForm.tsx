import { AdminProductCatalogFields } from "@/components/admin/AdminProductCatalogFields";
import type { Product, ProductImage } from "@prisma/client";

const fieldClass =
    "w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100";

type ProductWithImages = Product & { images: ProductImage[] };

type AdminProductEditFormProps = {
    product: ProductWithImages;
    action: (formData: FormData) => Promise<void>;
};

export function AdminProductEditForm({ product, action }: AdminProductEditFormProps) {
    return (
        <form action={action} className="glass space-y-6 rounded-2xl border border-white/10 p-4 md:p-6">
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="slug" value={product.slug} />

            <div>
                <h2 className="mb-4 text-lg font-semibold">Datos generales</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm md:col-span-2">
                        <span className="mb-1 block text-zinc-400">Nombre</span>
                        <input name="name" defaultValue={product.name} required className={fieldClass} />
                    </label>

                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Slug (solo lectura)</span>
                        <input
                            value={product.slug}
                            readOnly
                            className={`${fieldClass} cursor-not-allowed opacity-60`}
                        />
                    </label>

                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">N3D slug</span>
                        <input name="n3dSlug" defaultValue={product.n3dSlug ?? ""} className={fieldClass} />
                    </label>

                    <AdminProductCatalogFields
                        defaultVisible={product.isVisibleInCatalog}
                        defaultStatus={product.status}
                    />

                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Categoria</span>
                        <input name="category" defaultValue={product.category} className={fieldClass} />
                    </label>

                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Precio (EUR)</span>
                        <div className="relative">
                            <input
                                type="number"
                                name="priceEuros"
                                step="0.01"
                                min="0"
                                defaultValue={
                                    product.priceCents != null
                                        ? (product.priceCents / 100).toFixed(2)
                                        : ""
                                }
                                className={`${fieldClass} pr-8`}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                                €
                            </span>
                        </div>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="featured"
                            value="on"
                            defaultChecked={product.featured}
                            className="rounded"
                        />
                        <span className="text-zinc-300">Destacado</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="available"
                            value="on"
                            defaultChecked={product.available}
                            className="rounded"
                        />
                        <span className="text-zinc-300">Disponible</span>
                    </label>
                </div>
            </div>

            <div>
                <h2 className="mb-4 text-lg font-semibold">Descripciones</h2>
                <div className="grid gap-3">
                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Descripcion corta</span>
                        <input
                            name="shortDescription"
                            defaultValue={product.shortDescription ?? ""}
                            className={fieldClass}
                        />
                    </label>
                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Descripcion larga</span>
                        <textarea
                            name="longDescription"
                            rows={4}
                            defaultValue={product.longDescription ?? ""}
                            className={fieldClass}
                        />
                    </label>
                </div>
            </div>

            <div>
                <h2 className="mb-4 text-lg font-semibold">Impresion 3D</h2>
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Tiempo (texto)</span>
                        <input name="printTime" defaultValue={product.printTime ?? ""} className={fieldClass} />
                    </label>
                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Tiempo (segundos)</span>
                        <input
                            type="number"
                            name="printTimeSeconds"
                            defaultValue={product.printTimeSeconds ?? ""}
                            className={fieldClass}
                        />
                    </label>
                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Peso (gramos)</span>
                        <input
                            type="number"
                            step="0.1"
                            name="weightGrams"
                            defaultValue={product.weightGrams ?? ""}
                            className={fieldClass}
                        />
                    </label>
                </div>
            </div>

            <div>
                <h2 className="mb-4 text-lg font-semibold">Pokemon y etiquetas</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Nombre Pokemon</span>
                        <input name="pokemonName" defaultValue={product.pokemonName ?? ""} className={fieldClass} />
                    </label>
                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Numero Pokedex</span>
                        <input
                            type="number"
                            name="pokedexNumber"
                            defaultValue={product.pokedexNumber ?? ""}
                            className={fieldClass}
                        />
                    </label>
                    <label className="text-sm md:col-span-2">
                        <span className="mb-1 block text-zinc-400">Tipos (separados por coma)</span>
                        <input
                            name="pokemonTypes"
                            defaultValue={product.pokemonTypes.join(", ")}
                            className={fieldClass}
                        />
                    </label>
                    <label className="text-sm md:col-span-2">
                        <span className="mb-1 block text-zinc-400">Tags (separados por coma)</span>
                        <input name="tags" defaultValue={product.tags.join(", ")} className={fieldClass} />
                    </label>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
                <button
                    type="submit"
                    className="rounded-lg bg-oak-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-oak-500"
                >
                    Guardar cambios
                </button>
            </div>
        </form>
    );
}
