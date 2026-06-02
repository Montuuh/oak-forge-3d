import Link from "next/link";

export const dynamic = "force-dynamic";

interface LoginPageProps {
    searchParams?: {
        error?: string;
        next?: string;
    };
}

export default function AdminLoginPage({ searchParams }: LoginPageProps) {
    const next = searchParams?.next?.startsWith("/") ? searchParams.next : "/admin";
    const hasError = searchParams?.error === "invalid_credentials";

    return (
        <div className="min-h-screen py-10 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-md mx-auto glass rounded-2xl p-6 md:p-8">
                    <h1 className="font-display text-3xl font-bold mb-2">Admin Login</h1>
                    <p className="text-zinc-400 mb-6">
                        Acceso del propietario para gestionar el catalogo.
                    </p>

                    {hasError && (
                        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                            Contrasena invalida.
                        </div>
                    )}

                    <form method="POST" action="/api/admin/login" className="space-y-4">
                        <input type="hidden" name="next" value={next} />
                        <label className="block">
                            <span className="mb-1 block text-sm text-zinc-300">Contrasena</span>
                            <input
                                type="password"
                                name="password"
                                required
                                className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2.5 text-white outline-none transition focus:border-oak-500/60"
                            />
                        </label>
                        <button
                            type="submit"
                            className="w-full rounded-xl bg-oak-600 px-4 py-2.5 font-medium text-white transition hover:bg-oak-500"
                        >
                            Entrar
                        </button>
                    </form>

                    <div className="mt-6">
                        <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
                            Volver al sitio publico
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
