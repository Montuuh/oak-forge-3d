import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminPage() {
    return (
        <div className="min-h-screen py-10 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="glass rounded-2xl p-6 md:p-8">
                        <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">
                            Admin Console
                        </h1>
                        <p className="text-zinc-400">
                            Base administrativa inicial para gestionar el catalogo de Oak&apos;s Forge 3D.
                            En el siguiente paso conectaremos autenticacion de propietario y CRUD de productos.
                        </p>
                    </div>

                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Roadmap (fase actual)</h2>
                        <ul className="space-y-2 text-zinc-300">
                            <li>1. Base de datos (Prisma + Postgres)</li>
                            <li>2. Login de propietario</li>
                            <li>3. Estados de producto y visibilidad</li>
                            <li>4. Pool de imagenes y aprobacion AI</li>
                            <li>5. Export manual de catalogo publico</li>
                        </ul>
                    </div>

                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Acciones</h2>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/admin/products"
                                className="rounded-xl bg-oak-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-oak-500"
                            >
                                Gestionar productos
                            </Link>
                            <Link
                                href="/admin/products?image=needs_review&pilot=1"
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                            >
                                Revision imagenes (piloto)
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
