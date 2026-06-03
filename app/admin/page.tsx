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
                            Gestiona productos, referencias N3D/locales, candidatos AI y visibilidad
                            del catalogo publico. En produccion el sitio lee productos visibles desde
                            la base de datos.
                        </p>
                    </div>

                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Prioridad inmediata</h2>
                        <p className="text-sm text-zinc-300">
                            Prompt <strong className="text-zinc-200">v7</strong>: estudio fijo con
                            referencia de escena (mesa roble + gotelé). Sube{" "}
                            <code className="text-zinc-400">public/images/studio/default.jpg</code> o
                            una escena personalizada desde la ficha de producto.
                        </p>
                    </div>

                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Acciones</h2>
                        <div className="flex flex-wrap items-start gap-3">
                            <Link
                                href="/admin/products"
                                className="rounded-xl bg-oak-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-oak-500"
                            >
                                Gestionar productos
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
