import { getAllProducts, formatPrintTime, formatWeight } from "@/lib/products";
import CatalogSection from "@/components/CatalogSection";

export default function Home() {
    const products = getAllProducts();
    const characterProducts = products.filter(p => p.category === 'character');
    const standardProducts = products.filter(p => p.category === 'standard');

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative py-20 md:py-32 overflow-hidden">
                <div className="container mx-auto px-4 md:px-6 text-center">
                    <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-in">
                        <span className="text-[#D4A520]">Oak's Forge</span>
                        <span className="text-zinc-400"> 3D</span>
                    </h1>
                    <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 animate-in delay-100">
                        Figuras coleccionables impresas con precisión.
                        Cada pieza es creada con pasión y atención al detalle.
                    </p>
                    <div className="flex justify-center gap-4 animate-in delay-200">
                        <a
                            href="#catalogo"
                            className="px-6 py-3 bg-[#2A5A3A] hover:bg-[#1E4D2B] text-white font-medium rounded-xl transition-all hover:scale-105 shadow-lg shadow-[#2A5A3A]/30"
                        >
                            Ver Catálogo
                        </a>
                        <a
                            href="#contacto"
                            className="px-6 py-3 glass rounded-xl font-medium hover:bg-white/10 transition-all"
                        >
                            Contactar
                        </a>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-1/2 left-0 w-72 h-72 bg-[#2A5A3A]/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                <div className="absolute top-1/2 right-0 w-72 h-72 bg-[#D4A520]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            </section>

            {/* About Me Section */}
            <section className="py-20 border-y border-white/5 bg-black/20">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1 space-y-6 text-left animate-in slide-in-from-left-4 duration-700">
                            <h2 className="font-display text-3xl md:text-4xl font-bold">
                                <span className="text-[#D4A520]">Más que</span> figuras,<br />
                                <span className="text-white">obras de arte.</span>
                            </h2>
                            <p className="text-lg text-zinc-400 leading-relaxed">
                                En Oak's Forge 3D, combinamos tecnología de impresión de vanguardia con un acabado artesanal meticuloso.
                                Cada pieza es procesada, pulida y verificada personalmente para asegurar que llegue a tus manos con la calidad que mereces.
                            </p>
                            <p className="text-lg text-zinc-400 leading-relaxed">
                                No solo vendemos impresiones; entregamos coleccionables que cobran vida en tu estantería.
                            </p>
                            <div className="pt-4">
                                <a href="#contacto" className="text-[#7EC8A3] hover:text-[#5DA680] font-medium flex items-center gap-2 transition-colors group">
                                    Conoce más sobre el proceso
                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                        <div className="flex-1 relative w-full h-80 md:h-96 rounded-2xl overflow-hidden glass group animate-in slide-in-from-right-4 duration-700 delay-200">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#2A5A3A]/20 to-[#D4A520]/10" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-zinc-600 font-display text-9xl opacity-20 select-none">OF</span>
                            </div>
                            {/* Decorative circles */}
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#D4A520]/20 rounded-full blur-2xl" />
                            <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#7EC8A3]/20 rounded-full blur-2xl" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Catalog Section */}
            <section id="catalogo" className="py-16 md:py-24">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center mb-12">
                        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                            Nuestro Catálogo
                        </h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">
                            Explora nuestra colección de figuras 3D. Cada diseño está optimizado
                            para la mejor calidad de impresión.
                        </p>
                    </div>

                    {products.length > 0 ? (
                        <CatalogSection
                            characterProducts={characterProducts}
                            standardProducts={standardProducts}
                        />
                    ) : (
                        <div className="text-center py-20 glass rounded-2xl">
                            <div className="text-6xl mb-4">🌳</div>
                            <h3 className="text-xl font-semibold mb-2">Catálogo Vacío</h3>
                            <p className="text-zinc-400 mb-4">
                                Ejecuta <code className="bg-zinc-800 px-2 py-1 rounded">npm run sync</code> para
                                sincronizar los productos.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Contact Section */}
            <section id="contacto" className="py-16 md:py-24 border-t border-white/5">
                <div className="container mx-auto px-4 md:px-6 text-center">
                    <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                        ¿Interesado en una figura?
                    </h2>
                    <p className="text-zinc-400 max-w-xl mx-auto mb-8">
                        Contáctanos por mensaje directo para consultar disponibilidad,
                        precios y opciones de personalización.
                    </p>
                    <a
                        href="https://instagram.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        Escríbenos por Instagram
                    </a>
                </div>
            </section>
        </div>
    );
}
