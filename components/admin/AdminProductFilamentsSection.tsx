import type { ProductFilament } from "@prisma/client";

type AdminProductFilamentsSectionProps = {
    filaments: ProductFilament[];
};

export function AdminProductFilamentsSection({ filaments }: AdminProductFilamentsSectionProps) {
    if (filaments.length === 0) {
        return (
            <div>
                <h2 className="mb-2 text-lg font-semibold">Filamentos</h2>
                <p className="text-sm text-zinc-500">
                    Sin datos. Sincroniza con N3D para importar colores y gramos por filamento.
                </p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="mb-2 text-lg font-semibold">Filamentos</h2>
            <p className="mb-3 text-xs text-zinc-500">
                Colores y consumo por pieza (para inventario futuro). Se actualizan desde Sync N3D.
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-black/30 text-xs uppercase tracking-wide text-zinc-500">
                            <th className="px-3 py-2 font-medium">Color</th>
                            <th className="px-3 py-2 font-medium">Serie</th>
                            <th className="px-3 py-2 font-medium text-right">Gramos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filaments.map((row) => (
                            <tr key={row.id} className="border-b border-white/5">
                                <td className="px-3 py-2 text-zinc-200">{row.color}</td>
                                <td className="px-3 py-2 text-zinc-400">{row.series}</td>
                                <td className="px-3 py-2 text-right text-zinc-300">
                                    {row.weightGrams} g
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
