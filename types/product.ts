/**
 * Oak's Forge 3D - Internal Product Types
 * Simplified structure for the local catalog
 */

/** Product in the local catalog */
export interface Product {
    // Core identifiers
    id: string;              // Same as N3D slug for consistency
    slug: string;            // URL-friendly identifier
    name: string;            // Display name

    // Category
    category: 'character' | 'standard';
    tags?: string[];         // e.g. ["Legendario", "Mega"]

    // Metrics from N3D API
    print_time: string;      // Human readable "HH:MM:SS"
    print_time_seconds: number;
    weight_grams: number;

    // Pokemon data (if applicable)
    pokemon_name?: string;
    pokedex_number?: number;
    pokemon_types?: string[];
    pokemon_description?: string;

    // Image
    image_path: string;      // Local path: /images/products/[slug].webp

    // N3D reference
    n3d_url: string;         // Link back to N3D

    // Custom fields (manually editable, preserved on sync)
    custom_description?: string;
    price?: number;
    dimensions?: {
        width: number;
        height: number;
        depth: number;
    };
    featured?: boolean;
    available?: boolean;

    // Metadata
    last_synced: string;     // ISO timestamp
}

/** Structure of the products.json file */
export interface ProductsData {
    version: string;
    last_updated: string;
    total_products: number;
    products: Product[];
}

/** Categories for filtering */
export type ProductCategory = 'all' | 'character' | 'standard';
