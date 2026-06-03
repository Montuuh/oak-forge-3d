import { notFound } from "next/navigation";
import Link from "next/link";
import { CatalogProductImage } from "@/components/CatalogProductImage";
import { hasCatalogImage } from "@/lib/catalog-image";
import { getAllProductSlugs, getProductBySlug, formatPrintTime, formatWeight, resolveProductImagePath } from "@/lib/products";
import type { Metadata } from "next";

interface PageProps {
    params: { slug: string };
}

// Generate static pages at build time
export async function generateStaticParams() {
    const slugs = getAllProductSlugs();
    return slugs.map((slug) => ({ slug }));
}

// Dynamic metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const product = getProductBySlug(params.slug);

    if (!product) {
        return {
            title: "Producto no encontrado | Oak's Forge 3D",
        };
    }

    const imagePath = resolveProductImagePath(product);

    return {
        title: `${product.name} | Oak's Forge 3D`,
        description: product.custom_description ||
            `${product.name} - Figura 3D de alta calidad. Tiempo de impresión: ${product.print_time}`,
        openGraph: {
            title: product.name,
            description: product.custom_description || `Figura 3D: ${product.name}`,
            ...(hasCatalogImage(imagePath) ? { images: [imagePath] } : {}),
        },
    };
}

export default function ProductPage({ params }: PageProps) {
    const product = getProductBySlug(params.slug);

    if (!product) {
        notFound();
    }
    const imagePath = resolveProductImagePath(product);

    const typeColors: Record<string, string> = {
        normal: 'bg-gray-400',
        fire: 'bg-orange-500',
        water: 'bg-blue-500',
        electric: 'bg-yellow-400',
        grass: 'bg-green-500',
        ice: 'bg-cyan-400',
        fighting: 'bg-red-700',
        poison: 'bg-purple-500',
        ground: 'bg-amber-600',
        flying: 'bg-indigo-400',
        psychic: 'bg-pink-500',
        bug: 'bg-lime-500',
        rock: 'bg-stone-500',
        ghost: 'bg-purple-700',
        dragon: 'bg-violet-600',
        dark: 'bg-gray-700',
        steel: 'bg-slate-400',
        fairy: 'bg-pink-400',
    };

    return (
        <div className="min-h-screen py-8 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
                {/* Breadcrumb */}
                <nav className="mb-8">
                    <ol className="flex items-center gap-2 text-sm text-zinc-500">
                        <li>
                            <Link href="/" className="hover:text-white transition-colors">
                                Inicio
                            </Link>
                        </li>
                        <li>/</li>
                        <li>
                            <Link href="/#catalogo" className="hover:text-white transition-colors">
                                Catálogo
                            </Link>
                        </li>
                        <li>/</li>
                        <li className="text-white">{product.name}</li>
                    </ol>
                </nav>

                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Image Section */}
                    <div className="relative">
                        <div className="aspect-square relative rounded-2xl overflow-hidden glass-strong">
                            <CatalogProductImage
                                src={imagePath}
                                alt={product.name}
                                className="object-cover"
                                priority
                                sizes="(max-width: 1024px) 100vw, 50vw"
                            />

                            {/* Category badge */}
                            <div className="absolute top-4 left-4">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${product.category === 'character'
                                        ? 'bg-oak-500/80 text-white'
                                        : 'bg-forge-500/80 text-white'
                                    }`}>
                                    {product.category === 'character' ? 'Personaje' : 'Pokéball'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="flex flex-col">
                        {/* Pokemon info */}
                        {product.pokemon_name && (
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-sm text-zinc-500">
                                    #{product.pokedex_number?.toString().padStart(3, '0')}
                                </span>
                                <div className="flex gap-2">
                                    {product.pokemon_types?.map(type => (
                                        <span
                                            key={type}
                                            className={`px-2 py-0.5 text-xs font-medium rounded-full text-white ${typeColors[type] || 'bg-gray-500'}`}
                                        >
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                            {product.name}
                        </h1>

                        {/* Description */}
                        <p className="text-zinc-400 text-lg mb-8">
                            {product.custom_description || product.pokemon_description ||
                                "Figura 3D de alta calidad impresa con materiales premium."}
                        </p>

                        {/* Price (if set) */}
                        {product.price && (
                            <div className="mb-8">
                                <span className="text-3xl font-bold text-gradient">
                                    €{product.price.toFixed(2)}
                                </span>
                            </div>
                        )}

                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="glass rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-oak-500/20 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-oak-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm text-zinc-500">Tiempo de impresión</div>
                                        <div className="font-semibold">{formatPrintTime(product.print_time)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-forge-500/20 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-forge-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm text-zinc-500">Peso filamento</div>
                                        <div className="font-semibold">{formatWeight(product.weight_grams)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dimensions (if set) */}
                        {product.dimensions && (
                            <div className="glass rounded-xl p-4 mb-8">
                                <div className="text-sm text-zinc-500 mb-2">Dimensiones</div>
                                <div className="font-semibold">
                                    {product.dimensions.width} × {product.dimensions.height} × {product.dimensions.depth} mm
                                </div>
                            </div>
                        )}

                        {/* CTA Button */}
                        <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all hover:scale-105"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                                Pedir por DM
                            </a>

                            <a
                                href={product.n3d_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-6 py-4 glass rounded-xl font-medium hover:bg-white/10 transition-all"
                            >
                                Ver en N3D
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Back link */}
                <div className="mt-12 pt-8 border-t border-white/5">
                    <Link
                        href="/#catalogo"
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver al catálogo
                    </Link>
                </div>
            </div>
        </div>
    );
}
