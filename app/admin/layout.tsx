import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen">
            <header className="border-b border-white/10 bg-black/30 backdrop-blur">
                <div className="container mx-auto flex items-center justify-between px-4 py-4 md:px-6">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="font-display text-lg font-bold">
                            Oak&apos;s Forge Admin
                        </Link>
                        <nav className="flex items-center gap-3 text-sm text-zinc-300">
                            <Link href="/admin/products" className="hover:text-white transition-colors">
                                Productos
                            </Link>
                        </nav>
                    </div>
                    <form action="/api/admin/logout" method="POST">
                        <button
                            type="submit"
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
                        >
                            Cerrar sesion
                        </button>
                    </form>
                </div>
            </header>
            {children}
        </div>
    );
}
