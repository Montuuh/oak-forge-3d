"use client";

import Link from "next/link";
import Image from "next/image";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function Header() {
    const { favorites, showOnlyFavorites, toggleShowOnlyFavorites } = useFavorites();
    const { theme, setTheme } = useTheme();
    const favoritesCount = favorites.length;

    return (
        <header className="sticky top-0 z-50 w-full">
            <div className="glass-strong border-b border-white/5">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden group-hover:scale-110 transition-transform">
                                <Image
                                    src="/images/oaks_forge_3d_logo_c.png"
                                    alt="Oak's Forge 3D"
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                            <div className="hidden sm:block">
                                <span className="font-display font-bold text-lg">
                                    <span className="text-[#D4A520]">Oak's</span>
                                    <span className="text-white"> Forge </span>
                                    <span className="text-zinc-400">3D</span>
                                </span>
                            </div>
                        </Link>

                        {/* Navigation */}
                        <nav className="flex items-center gap-4 md:gap-6">
                            <Link
                                href="/#catalogo"
                                className="text-sm text-zinc-400 hover:text-[#7EC8A3] transition-colors"
                            >
                                Catálogo
                            </Link>
                            <Link
                                href="/#contacto"
                                className="text-sm text-zinc-400 hover:text-[#7EC8A3] transition-colors"
                            >
                                Contacto
                            </Link>

                            {/* Theme Toggle */}
                            <button
                                onClick={() => {
                                    if (theme === 'dark') setTheme('light');
                                    else if (theme === 'light') setTheme('system');
                                    else setTheme('dark');
                                }}
                                className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-white/10 hover:text-[#7EC8A3] transition-colors"
                                aria-label="Cambiar tema"
                                title={`Tema actual: ${theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Oscuro' : 'Claro'}`}
                            >
                                {theme === 'light' ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : theme === 'dark' ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </button>

                            {/* Favorites button */}
                            <button
                                onClick={toggleShowOnlyFavorites}
                                className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${showOnlyFavorites
                                    ? 'bg-[#D4A520]/20 text-[#D4A520]'
                                    : 'glass hover:bg-white/10'
                                    }`}
                                aria-label={showOnlyFavorites ? 'Mostrar todos los productos' : 'Mostrar favoritos'}
                            >
                                {showOnlyFavorites ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                )}

                                {/* Counter badge */}
                                {favoritesCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4A520] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {favoritesCount > 9 ? '9+' : favoritesCount}
                                    </span>
                                )}
                            </button>

                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-white/10 hover:text-[#7EC8A3] transition-colors"
                                aria-label="Instagram"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                            </a>
                        </nav>
                    </div>
                </div>
            </div>
        </header>
    );
}

