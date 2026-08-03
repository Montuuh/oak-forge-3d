"use client";

import Link from "next/link";
import { CatalogProductImage } from "@/components/CatalogProductImage";
import { Product } from "@/types/product";
import { formatPrintTime, formatWeight, resolveProductImagePath } from "@/lib/product-display";
import { ProductFavoriteButton } from "@/components/ProductFavoriteButton";

interface ProductCardProps {
    product: Product;
    index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
    const imagePath = resolveProductImagePath(product);

    // Stagger animation delay
    const delay = Math.min(index * 50, 500);

    return (
        <Link
            href={`/products/${product.slug}`}
            className="group block"
            style={{ animationDelay: `${delay}ms` }}
        >
            <article className="glass rounded-2xl overflow-hidden hover-lift card-border h-full flex flex-col animate-in">
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-dark-900">
                    <CatalogProductImage
                        src={imagePath}
                        alt={product.name}
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Quick view indicator */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                            Ver detalles
                        </span>
                    </div>

                    {/* Category badge & Tags */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full backdrop-blur-sm ${product.category === 'character'
                            ? 'bg-[#2A5A3A]/90 text-white'
                            : 'bg-[#D4A520]/90 text-black'
                            }`}>
                            {product.category === 'character' ? 'Pokémon' : 'Pokéball'}
                        </span>

                        {product.tags?.map(tag => (
                            <span
                                key={tag}
                                className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-sm border border-white/10 shadow-lg ${tag === 'Legendario'
                                        ? 'bg-purple-600/90 text-white shadow-purple-500/20'
                                        : tag === 'Mega'
                                            ? 'bg-pink-600/90 text-white shadow-pink-500/20'
                                            : 'bg-zinc-800/90 text-zinc-300'
                                    }`}
                            >
                                {tag === 'Legendario' && '✨ '}
                                {tag}
                            </span>
                        ))}
                    </div>

                    <span
                        className="absolute top-3 right-3 z-10"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <ProductFavoriteButton slug={product.slug} className="static" />
                    </span>

                    {/* Featured badge - moved below favorite button */}
                    {product.featured && (
                        <div className="absolute top-14 right-3">
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-500/80 text-black backdrop-blur-sm">
                                ⭐ Destacado
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                    {/* Pokemon number */}
                    {product.pokedex_number && (
                        <span className="text-xs text-zinc-500 mb-1">
                            #{product.pokedex_number.toString().padStart(3, '0')}
                        </span>
                    )}

                    {/* Title */}
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-[#7EC8A3] transition-colors line-clamp-1">
                        {product.name}
                    </h3>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 mt-auto pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                            <svg className="w-4 h-4 text-[#7EC8A3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatPrintTime(product.print_time)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                            <svg className="w-4 h-4 text-[#D4A520]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                            <span>{formatWeight(product.weight_grams)}</span>
                        </div>
                    </div>

                    {/* Price (if set) */}
                    {product.price && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                            <span className="text-lg font-bold text-gradient">
                                €{product.price.toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
            </article>
        </Link>
    );
}
