import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Oak's Forge 3D | Catálogo de Impresión 3D",
    description: "Descubre nuestra colección de figuras 3D de alta calidad. Pokémon, personajes y diseños únicos impresos con precisión.",
    keywords: ["impresión 3D", "figuras", "pokémon", "3D printing", "coleccionables"],
    authors: [{ name: "Oak's Forge 3D" }],
    openGraph: {
        title: "Oak's Forge 3D | Catálogo de Impresión 3D",
        description: "Colección de figuras 3D de alta calidad",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
            <body className="min-h-screen flex flex-col">
                <ThemeProvider>
                    <FavoritesProvider>
                        <Header />
                        <main className="flex-1">
                            {children}
                        </main>
                        <Footer />
                    </FavoritesProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}

