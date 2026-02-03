/**
 * N3D Melbourne API Types
 * Types that map directly to the API response structure
 */

/** Design object from the /designs list endpoint */
export interface N3DDesignSummary {
    slug: string;
    title: string;
    category: 'character' | 'standard';
    image_url: string;
    print_time: string;
    total_weight_grams: number;
}

/** Pokemon data from single design endpoint */
export interface N3DPokemon {
    name: string;
    pokedex_number: number;
    types: string[];
    description: string | null;
}

/** Filament requirement from single design endpoint */
export interface N3DFilament {
    filament_id: number | null;
    color: string;
    series: string;
    img_swatch: string | null;
    weight_grams: number;
    product_url: string;
    affiliate_url: string;
}

/** Print profile from single design endpoint */
export interface N3DProfile {
    name: string;
    type: 'ams' | 'split' | 'mc';
    print_time: string;
    print_time_seconds: number;
    plate_count: number;
}

/** Full design object from /designs/{slug} endpoint */
export interface N3DDesignFull extends N3DDesignSummary {
    print_time_seconds: number;
    pokemon: N3DPokemon | null;
    filaments: N3DFilament[];
    profiles: N3DProfile[];
}

/** Pagination metadata from list responses */
export interface N3DPagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

/** Response from GET /designs */
export interface N3DDesignsResponse {
    data: N3DDesignSummary[];
    pagination: N3DPagination;
}

/** Response from POST /designs/batch */
export interface N3DBatchResponse {
    data: N3DDesignFull[];
}

/** API error response */
export interface N3DErrorResponse {
    error: string;
}
