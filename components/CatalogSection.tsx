"use client";

import { useState, useMemo } from "react";
import { useFavorites } from "@/contexts/FavoritesContext";
import ProductCard from "@/components/ProductCard";
import CatalogFilters, { SortOption, GridSize } from "@/components/CatalogFilters";
import { Product } from "@/types/product";

interface CatalogSectionProps {
    characterProducts: Product[];
    standardProducts: Product[];
}

function sortProducts(products: Product[], sortOption: SortOption): Product[] {
    const sorted = [...products];

    switch (sortOption) {
        case "name-asc":
            return sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        case "name-desc":
            return sorted.sort((a, b) => b.name.localeCompare(a.name, 'es'));
        case "pokedex-asc":
            return sorted.sort((a, b) => (a.pokedex_number || 9999) - (b.pokedex_number || 9999));
        case "pokedex-desc":
            return sorted.sort((a, b) => (b.pokedex_number || 0) - (a.pokedex_number || 0));
        default:
            return sorted;
    }
}

function filterBySearch(products: Product[], query: string): Product[] {
    if (!query.trim()) return products;

    const normalizedQuery = query.toLowerCase().trim();
    return products.filter(p =>
        p.name.toLowerCase().includes(normalizedQuery) ||
        p.pokemon_name?.toLowerCase().includes(normalizedQuery) ||
        p.slug.toLowerCase().includes(normalizedQuery)
    );
}

export default function CatalogSection({ characterProducts, standardProducts }: CatalogSectionProps) {
    const { favorites, showOnlyFavorites } = useFavorites();
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState<SortOption>("name-asc");
    const [gridSize, setGridSize] = useState<GridSize>("normal");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    // Grid class based on size
    const gridClass = {
        normal: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
        compact: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4",
        mini: "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3",
    }[gridSize];

    // Combine all products for unified filtering/sorting
    const allProducts = useMemo(() => {
        return [...characterProducts, ...standardProducts];
    }, [characterProducts, standardProducts]);

    // Apply all filters and sorting
    const processedProducts = useMemo(() => {
        let result = allProducts;

        // Filter by favorites if enabled
        if (showOnlyFavorites) {
            result = result.filter(p => favorites.includes(p.slug));
        }

        // Filter by search query
        result = filterBySearch(result, searchQuery);

        // Filter by tag or category
        if (selectedTag) {
            if (selectedTag.startsWith('category:')) {
                const category = selectedTag.split(':')[1];
                result = result.filter(p => p.category === category);
            } else {
                result = result.filter(p => p.tags && p.tags.includes(selectedTag));
            }
        }

        // Sort
        result = sortProducts(result, sortOption);

        return result;
    }, [allProducts, showOnlyFavorites, favorites, searchQuery, sortOption, selectedTag]);

    // Separate back into categories for display
    const filteredCharacterProducts = processedProducts.filter(p => p.category === 'character');
    const filteredStandardProducts = processedProducts.filter(p => p.category === 'standard');

    const totalFiltered = processedProducts.length;
    const hasNoFavorites = showOnlyFavorites && favorites.length === 0;
    const hasNoResults = !hasNoFavorites && totalFiltered === 0 && (searchQuery || showOnlyFavorites);

    return (
        <>
            {/* Filter Bar */}
            <CatalogFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOption={sortOption}
                onSortChange={setSortOption}
                gridSize={gridSize}
                onGridSizeChange={setGridSize}
                selectedTag={selectedTag}
                onTagChange={setSelectedTag}
            />

            {/* Filter indicator */}
            {showOnlyFavorites && (
                <div className="mb-8 flex items-center justify-center gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span>Mostrando favoritos</span>
                </div>
            )}

            {/* Search results indicator */}
            {searchQuery && totalFiltered > 0 && (
                <div className="mb-6 text-sm text-zinc-400 text-center">
                    {totalFiltered} resultado{totalFiltered !== 1 ? 's' : ''} para "{searchQuery}"
                </div>
            )}

            {/* Empty favorites state */}
            {hasNoFavorites && (
                <div className="text-center py-20 glass rounded-2xl">
                    <div className="text-6xl mb-4">💔</div>
                    <h3 className="text-xl font-semibold mb-2">No tienes favoritos</h3>
                    <p className="text-zinc-400 mb-4">
                        Haz clic en el corazón de cualquier producto para añadirlo a tus favoritos.
                    </p>
                </div>
            )}

            {/* No results state */}
            {hasNoResults && (
                <div className="text-center py-20 glass rounded-2xl">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold mb-2">No se encontraron resultados</h3>
                    <p className="text-zinc-400 mb-4">
                        {searchQuery
                            ? `No hay productos que coincidan con "${searchQuery}"`
                            : "Los productos favoritos no están disponibles actualmente."
                        }
                    </p>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="px-4 py-2 text-sm text-oak-400 hover:text-oak-300 transition-colors"
                        >
                            Limpiar búsqueda
                        </button>
                    )}
                </div>
            )}

            {/* Character Designs */}
            {filteredCharacterProducts.length > 0 && (
                <div className="mb-16">
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <span className="w-8 h-1 bg-gradient-to-r from-oak-500 to-oak-400 rounded-full" />
                        Pokémon
                        <span className="text-sm font-normal text-zinc-500">
                            ({filteredCharacterProducts.length})
                        </span>
                    </h3>
                    <div className={gridClass}>
                        {filteredCharacterProducts.map((product, index) => (
                            <ProductCard
                                key={product.slug}
                                product={product}
                                index={index}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Standard Designs */}
            {filteredStandardProducts.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <span className="w-8 h-1 bg-gradient-to-r from-forge-500 to-forge-400 rounded-full" />
                        Pokéballs
                        <span className="text-sm font-normal text-zinc-500">
                            ({filteredStandardProducts.length})
                        </span>
                    </h3>
                    <div className={gridClass}>
                        {filteredStandardProducts.map((product, index) => (
                            <ProductCard
                                key={product.slug}
                                product={product}
                                index={index}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
