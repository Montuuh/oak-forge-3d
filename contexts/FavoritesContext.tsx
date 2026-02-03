"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface FavoritesContextType {
    favorites: string[];
    toggleFavorite: (productSlug: string) => void;
    isFavorite: (productSlug: string) => boolean;
    showOnlyFavorites: boolean;
    toggleShowOnlyFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY = "oak-forge-favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load favorites from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setFavorites(parsed);
                }
            }
        } catch (error) {
            console.error("Error loading favorites from localStorage:", error);
        }
        setIsHydrated(true);
    }, []);

    // Save favorites to localStorage whenever they change
    useEffect(() => {
        if (isHydrated) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
            } catch (error) {
                console.error("Error saving favorites to localStorage:", error);
            }
        }
    }, [favorites, isHydrated]);

    const toggleFavorite = (productSlug: string) => {
        setFavorites((prev) => {
            if (prev.includes(productSlug)) {
                return prev.filter((slug) => slug !== productSlug);
            }
            return [...prev, productSlug];
        });
    };

    const isFavorite = (productSlug: string) => {
        return favorites.includes(productSlug);
    };

    const toggleShowOnlyFavorites = () => {
        setShowOnlyFavorites((prev) => !prev);
    };

    return (
        <FavoritesContext.Provider
            value={{
                favorites,
                toggleFavorite,
                isFavorite,
                showOnlyFavorites,
                toggleShowOnlyFavorites,
            }}
        >
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error("useFavorites must be used within a FavoritesProvider");
    }
    return context;
}
