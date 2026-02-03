"use client";

import { useState } from "react";

export type SortOption = "name-asc" | "name-desc" | "pokedex-asc" | "pokedex-desc";
export type GridSize = "normal" | "compact" | "mini";

interface CatalogFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    sortOption: SortOption;
    onSortChange: (option: SortOption) => void;
    gridSize: GridSize;
    onGridSizeChange: (size: GridSize) => void;
    selectedTag: string | null;
    onTagChange: (tag: string | null) => void;
}

export default function CatalogFilters({
    searchQuery,
    onSearchChange,
    sortOption,
    onSortChange,
    gridSize,
    onGridSizeChange,
    selectedTag,
    onTagChange,
}: CatalogFiltersProps) {
    return (
        <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="relative flex-1">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <input
                        type="text"
                        placeholder="Buscar diseño..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 glass rounded-xl border border-white/10 bg-[var(--bg-card)]/50 text-[var(--text-primary)] placeholder-zinc-500 focus:outline-none focus:border-oak-500/50 focus:ring-1 focus:ring-oak-500/20 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[var(--text-primary)] transition-colors"
                            aria-label="Limpiar búsqueda"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Grid Size & Sort Container */}
                <div className="flex gap-4">
                    {/* Grid Size Toggle */}
                    <div className="flex items-center gap-1 glass rounded-xl border border-white/10 bg-[var(--bg-card)]/50 p-1">
                        <button
                            onClick={() => onGridSizeChange("normal")}
                            className={`p-2 rounded-lg transition-all ${gridSize === "normal" ? "bg-oak-500/30 text-oak-400" : "text-zinc-500 hover:text-[var(--text-primary)]"}`}
                            aria-label="Vista normal"
                            title="Vista normal"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} />
                                <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} />
                                <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} />
                                <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2} />
                            </svg>
                        </button>
                        <button
                            onClick={() => onGridSizeChange("compact")}
                            className={`p-2 rounded-lg transition-all ${gridSize === "compact" ? "bg-oak-500/30 text-oak-400" : "text-zinc-500 hover:text-[var(--text-primary)]"}`}
                            aria-label="Vista compacta"
                            title="Vista compacta"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="5" height="5" rx="0.5" strokeWidth={2} />
                                <rect x="10" y="3" width="5" height="5" rx="0.5" strokeWidth={2} />
                                <rect x="17" y="3" width="5" height="5" rx="0.5" strokeWidth={2} />
                                <rect x="3" y="10" width="5" height="5" rx="0.5" strokeWidth={2} />
                                <rect x="10" y="10" width="5" height="5" rx="0.5" strokeWidth={2} />
                                <rect x="17" y="10" width="5" height="5" rx="0.5" strokeWidth={2} />
                                <rect x="3" y="17" width="5" height="5" rx="0.5" strokeWidth={2} />
                                <rect x="10" y="17" width="5" height="5" rx="0.5" strokeWidth={2} />
                                <rect x="17" y="17" width="5" height="5" rx="0.5" strokeWidth={2} />
                            </svg>
                        </button>
                        <button
                            onClick={() => onGridSizeChange("mini")}
                            className={`p-2 rounded-lg transition-all ${gridSize === "mini" ? "bg-oak-500/30 text-oak-400" : "text-zinc-500 hover:text-[var(--text-primary)]"}`}
                            aria-label="Vista mini"
                            title="Vista mini"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="2" y="2" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="7" y="2" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="12" y="2" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="17" y="2" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="2" y="7" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="7" y="7" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="12" y="7" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="17" y="7" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="2" y="12" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="7" y="12" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="12" y="12" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="17" y="12" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="2" y="17" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="7" y="17" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="12" y="17" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                                <rect x="17" y="17" width="4" height="4" rx="0.5" strokeWidth={1.5} />
                            </svg>
                        </button>
                    </div>

                    <div className="relative">
                        <select
                            value={sortOption}
                            onChange={(e) => onSortChange(e.target.value as SortOption)}
                            className="appearance-none w-full sm:w-auto px-4 py-2.5 pr-10 glass rounded-xl border border-white/10 bg-[var(--bg-card)]/50 text-[var(--text-primary)] focus:outline-none focus:border-oak-500/50 focus:ring-1 focus:ring-oak-500/20 transition-all cursor-pointer [&>option]:bg-[var(--bg-card)] [&>option]:text-[var(--text-primary)]"
                        >
                            <option value="name-asc" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Nombre (A-Z)</option>
                            <option value="name-desc" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Nombre (Z-A)</option>
                            <option value="pokedex-asc" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Nº Pokédex ↑</option>
                            <option value="pokedex-desc" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Nº Pokédex ↓</option>
                        </select>
                        <svg
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Tag Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:pb-0">
                <button
                    onClick={() => onTagChange(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedTag === null
                        ? 'bg-[#D4A520] text-black shadow-lg shadow-[#D4A520]/20'
                        : 'glass text-zinc-400 hover:text-[var(--text-primary)] hover:bg-white/10'
                        }`}
                >
                    Todos
                </button>
                <button
                    onClick={() => onTagChange('category:character')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedTag === 'category:character'
                        ? 'bg-[#2A5A3A] text-white shadow-lg shadow-[#2A5A3A]/30'
                        : 'glass text-zinc-400 hover:text-[#2A5A3A] hover:bg-white/10'
                        }`}
                >
                    Pokémon
                </button>
                <button
                    onClick={() => onTagChange('category:standard')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedTag === 'category:standard'
                        ? 'bg-[#D4A520] text-black shadow-lg shadow-[#D4A520]/20'
                        : 'glass text-zinc-400 hover:text-[#D4A520] hover:bg-white/10'
                        }`}
                >
                    Pokéballs
                </button>
                <div className="w-px h-6 bg-white/10 mx-1 self-center" />
                <button
                    onClick={() => onTagChange('Legendario')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${selectedTag === 'Legendario'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : 'glass text-zinc-400 hover:text-purple-400 hover:bg-white/10'
                        }`}
                >
                    <span>✨</span> Legendarios
                </button>
                <button
                    onClick={() => onTagChange('Mega')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${selectedTag === 'Mega'
                        ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                        : 'glass text-zinc-400 hover:text-pink-400 hover:bg-white/10'
                        }`}
                >
                    <span className="font-bold italic">M</span> Megas
                </button>
            </div>
        </div>
    );
}
