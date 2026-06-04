import Link from "next/link";

const fieldClass =
    "w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100";

type AdminProductCreateFormProps = {
    action: (formData: FormData) => Promise<void>;
};

export function AdminProductCreateForm({ action }: AdminProductCreateFormProps) {
    return (
        <form action={action} className="glass space-y-6 rounded-2xl border border-white/10 p-4 md:p-6">
            <div>
                <h2 className="mb-4 text-lg font-semibold">Nuevo producto</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm md:col-span-2">
                        <span className="mb-1 block text-zinc-400">Nombre</span>
                        <input name="name" required className={fieldClass} placeholder="Bulbasaur" />
                    </label>

                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Slug (URL)</span>
                        <input
                            name="slug"
                            required
                            className={fieldClass}
                            placeholder="0001-bulbasaur"
                            pattern="[a-z0-9]+(-[a-z0-9]+)*"
                            title="Minusculas, numeros y guiones"
                        />
                    </label>

                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">N3D slug (opcional)</span>
                        <input name="n3dSlug" className={fieldClass} placeholder="0001-bulbasaur" />
                    </label>

                    <label className="text-sm">
                        <span className="mb-1 block text-zinc-400">Categoria</span>
                        <select name="category" defaultValue="character" className={fieldClass}>
                            <option value="character">character</option>
                            <option value="standard">standard</option>
                        </select>
                    </label>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                    Se crea en borrador, sin visibilidad en catalogo. Puedes sincronizar N3D o duplicar
                    otro producto despues.
                </p>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
                <button
                    type="submit"
                    className="rounded-lg bg-oak-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-oak-500"
                >
                    Crear producto
                </button>
                <Link
                    href="/admin/products"
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                >
                    Cancelar
                </Link>
            </div>
        </form>
    );
}
