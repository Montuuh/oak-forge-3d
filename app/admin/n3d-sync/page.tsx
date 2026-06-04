import Link from "next/link";
import { AdminN3dCatalogSyncPanel } from "@/components/admin/AdminN3dCatalogSyncPanel";

export const dynamic = "force-dynamic";

export default function AdminN3dCatalogSyncPage() {
    return (
        <div className="py-8 md:py-12">
            <div className="container mx-auto max-w-3xl px-4 md:px-6">
                <div className="mb-6">
                    <Link href="/admin" className="text-sm text-zinc-400 hover:text-white">
                        ← Admin
                    </Link>
                    <h1 className="mt-2 font-display text-3xl font-bold">Sync catálogo N3D</h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        Importación masiva desde la API de N3D Melbourne. Para un solo producto
                        con comparación campo a campo, usa la ficha del producto.
                    </p>
                </div>

                <AdminN3dCatalogSyncPanel />

                <p className="mt-6 text-xs text-zinc-600">
                    CLI local (misma lógica):{" "}
                    <code className="text-zinc-500">npm run sync:n3d:overwrite-all</code> ·{" "}
                    <code className="text-zinc-500">npm run sync:n3d:import-new</code>
                </p>
            </div>
        </div>
    );
}
