"use client";

import { useFavorites } from "@/contexts/FavoritesContext";

type ProductFavoriteButtonProps = {
    slug: string;
    className?: string;
    size?: "md" | "lg";
};

export function ProductFavoriteButton({
    slug,
    className = "absolute top-3 right-3",
    size = "md",
}: ProductFavoriteButtonProps) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const active = isFavorite(slug);
    const sizeClass = size === "lg" ? "h-11 w-11" : "h-9 w-9";
    const iconClass = size === "lg" ? "h-6 w-6" : "h-5 w-5";

    return (
        <button
            type="button"
            onClick={() => toggleFavorite(slug)}
            className={`${sizeClass} flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 ${className} ${
                active
                    ? "bg-[#D4A520] text-black"
                    : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
            }`}
            aria-label={active ? "Quitar de favoritos" : "Añadir a favoritos"}
            aria-pressed={active}
        >
            {active ? (
                <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
            ) : (
                <svg
                    className={iconClass}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                </svg>
            )}
        </button>
    );
}
