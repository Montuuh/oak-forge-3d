export type ImageSearchProduct = {
    name: string;
    slug: string;
    pokemonName?: string | null;
};

function formatPokemonName(product: ImageSearchProduct): string {
    if (product.pokemonName?.trim()) {
        const raw = product.pokemonName.trim();
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    const match = product.name.match(/-\s*([^-]+?)(?:\s*-\s*|$)/i);
    if (match?.[1]) {
        return match[1].trim();
    }
    return product.name;
}

/** Vendedor con fotos de referencia fiables (opcional en busqueda web). */
export const IMAGE_SEARCH_VENDOR_READYTOPRINT3D = "readytoprint3d";

export function buildEffectiveImageSearchQuery(
    baseQuery: string,
    includeReadyToPrint3d: boolean,
): string {
    const trimmed = baseQuery.trim();
    if (!includeReadyToPrint3d) return trimmed;
    if (trimmed.toLowerCase().includes(IMAGE_SEARCH_VENDOR_READYTOPRINT3D)) {
        return trimmed;
    }
    return `${trimmed} ${IMAGE_SEARCH_VENDOR_READYTOPRINT3D}`.trim();
}

/** Query orientada a fotos reales de bolas N3D (referencia de forma). */
export function buildReferenceImageSearchQuery(product: ImageSearchProduct): string {
    const pokemon = formatPokemonName(product);
    return `n3d ${pokemon} ball`;
}
