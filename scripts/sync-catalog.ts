/**
 * Oak's Forge 3D - Catalog Sync Script
 * 
 * Fetches designs from N3D API and syncs to local products.json
 * Run with: npm run sync (or: npx tsx scripts/sync-catalog.ts)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { N3DDesignsResponse, N3DDesignSummary, N3DDesignFull } from '../types/api';
import type { Product, ProductsData } from '../types/product';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Load API key directly from .env.local file (no dotenv dependency)
function loadApiKey(): string | null {
    const envPath = path.join(process.cwd(), '.env.local');

    console.log(`[DEBUG] Looking for .env.local at: ${envPath}`);

    if (!fs.existsSync(envPath)) {
        console.log(`[DEBUG] .env.local not found!`);
        return null;
    }

    const content = fs.readFileSync(envPath, 'utf-8');
    console.log(`[DEBUG] .env.local content length: ${content.length}`);

    // More robust regex that handles various line endings
    const match = content.match(/N3D_API_KEY\s*=\s*([^\s\r\n]+)/);

    if (match) {
        const key = match[1].trim();
        console.log(`[DEBUG] Extracted key: "${key}"`);
        console.log(`[DEBUG] Key length: ${key.length}`);
        return key;
    }

    console.log(`[DEBUG] No API key found in .env.local`);
    return null;
}

const API_BASE_URL = 'https://n3dmelbourne.com/api/v1';
const API_KEY = loadApiKey();
const PRODUCTS_JSON_PATH = path.join(process.cwd(), 'data', 'products.json');
const BLOCKLIST_PATH = path.join(process.cwd(), 'data', 'blocklist.json');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'products');

// Rate limiting - 30 requests per minute
const RATE_LIMIT_DELAY_MS = 2100; // ~28 requests per minute to be safe

// ============================================================================
// LOGGING
// ============================================================================

const log = {
    info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg: string) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
    warn: (msg: string) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
    error: (msg: string) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
    debug: (msg: string) => console.log(`\x1b[90m[DEBUG]\x1b[0m ${msg}`),
    progress: (current: number, total: number, msg: string) =>
        console.log(`\x1b[35m[${current}/${total}]\x1b[0m ${msg}`),
};

// ============================================================================
// FILE SYSTEM HELPERS
// ============================================================================

function ensureDirectories(): void {
    const dataDir = path.dirname(PRODUCTS_JSON_PATH);

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        log.info(`Created directory: ${dataDir}`);
    }

    if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
        log.info(`Created directory: ${IMAGES_DIR}`);
    }
}

function loadExistingProducts(): Map<string, Product> {
    const existing = new Map<string, Product>();

    if (fs.existsSync(PRODUCTS_JSON_PATH)) {
        try {
            const data = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf-8')) as ProductsData;
            for (const product of data.products) {
                existing.set(product.slug, product);
            }
            log.info(`Loaded ${existing.size} existing products from products.json`);
        } catch (error) {
            log.warn(`Could not parse existing products.json: ${error}`);
        }
    }

    return existing;
}

function loadBlocklist(): Set<string> {
    const blocklist = new Set<string>();

    if (fs.existsSync(BLOCKLIST_PATH)) {
        try {
            const data = JSON.parse(fs.readFileSync(BLOCKLIST_PATH, 'utf-8'));
            if (Array.isArray(data.blocklist)) {
                for (const slug of data.blocklist) {
                    blocklist.add(slug);
                }
                log.info(`Loaded ${blocklist.size} blocked products from blocklist.json`);
            }
        } catch (error) {
            log.warn(`Could not parse blocklist.json: ${error}`);
        }
    }

    return blocklist;
}

// ============================================================================
// API HELPERS
// ============================================================================

async function apiRequest<T>(endpoint: string): Promise<T> {
    let url = `${API_BASE_URL}${endpoint}`;
    const authHeader = `Bearer ${API_KEY}`;

    // Follow redirects manually to preserve Authorization header
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        log.debug(`Requesting: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            redirect: 'manual', // Don't auto-follow redirects
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        log.debug(`Response status: ${response.status}`);

        // Handle redirects manually
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('Location');
            if (location) {
                log.debug(`Redirecting to: ${location}`);
                url = location.startsWith('http') ? location : new URL(location, url).href;
                attempts++;
                continue;
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        return response.json() as Promise<T>;
    }

    throw new Error(`Too many redirects (${maxAttempts})`);
}

async function fetchAllDesigns(): Promise<N3DDesignSummary[]> {
    const allDesigns: N3DDesignSummary[] = [];
    let page = 1;
    let hasMore = true;

    log.info('Fetching designs from N3D API...');

    while (hasMore) {
        const response = await apiRequest<N3DDesignsResponse>(
            `/designs?page=${page}&limit=50`
        );

        allDesigns.push(...response.data);

        log.progress(
            allDesigns.length,
            response.pagination.total,
            `Fetched page ${page}/${response.pagination.total_pages}`
        );

        hasMore = response.pagination.has_next;
        page++;

        if (hasMore) {
            await sleep(RATE_LIMIT_DELAY_MS);
        }
    }

    log.success(`Fetched ${allDesigns.length} designs total`);
    return allDesigns;
}

async function fetchDesignDetails(slug: string): Promise<N3DDesignFull> {
    return apiRequest<N3DDesignFull>(`/designs/${slug}`);
}

// ============================================================================
// IMAGE HELPERS
// ============================================================================

function imageExists(slug: string): boolean {
    const extensions = ['.webp', '.jpg', '.jpeg', '.png'];
    return extensions.some(ext =>
        fs.existsSync(path.join(IMAGES_DIR, `${slug}${ext}`))
    );
}

async function downloadImage(url: string, slug: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download: ${response.status}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const urlExt = path.extname(new URL(url).pathname) || '.webp';
        const filename = `${slug}${urlExt}`;
        const filepath = path.join(IMAGES_DIR, filename);

        fs.writeFileSync(filepath, buffer);

        return `/images/products/${filename}`;
    } catch (error) {
        log.warn(`Failed to download image for ${slug}: ${error}`);
        return `/images/products/${slug}.webp`;
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

function transformDesign(
    design: N3DDesignSummary,
    existingProduct: Product | undefined,
    imagePath: string,
    pokemonData?: N3DDesignFull['pokemon']
): Product {
    const now = new Date().toISOString();

    // Tag inference
    const tags: string[] = [];

    // Mega inference
    if (design.title.includes('Mega')) {
        tags.push('Mega');
    }

    // Legendary inference
    const LEGENDARIES = [
        'Mewtwo', 'Lugia', 'Rayquaza', 'Arceus', 'Giratina', 'Dialga', 'Palkia',
        'Zapdos', 'Moltres', 'Articuno', 'Raikou', 'Entei', 'Suicune',
        'Kyogre', 'Groudon', 'Zekrom', 'Reshiram', 'Ho-Oh', 'Celebi', 'Jirachi',
        'Deoxys', 'Darkrai', 'Cresselia', 'Heatran', 'Regigigas', 'Victini',
        'Zacian', 'Zamazenta', 'Eternatus', 'Koraidon', 'Miraidon'
    ];

    if (LEGENDARIES.some(l => design.title.includes(l))) {
        tags.push('Legendario');
    }
    const product: Product = {
        id: design.slug,
        slug: design.slug,
        name: design.title,
        category: design.category,
        print_time: design.print_time,
        print_time_seconds: 0,
        weight_grams: design.total_weight_grams,
        image_path: imagePath,
        n3d_url: `https://n3dmelbourne.com/designs/${design.slug}`,
        tags: tags.length > 0 ? tags : undefined,
        last_synced: now,
    };

    if (pokemonData) {
        product.pokemon_name = pokemonData.name;
        product.pokedex_number = pokemonData.pokedex_number;
        product.pokemon_types = pokemonData.types;
        product.pokemon_description = pokemonData.description || undefined;
    }

    // Preserve custom fields
    if (existingProduct) {
        if (existingProduct.custom_description) {
            product.custom_description = existingProduct.custom_description;
        }
        if (existingProduct.price !== undefined) {
            product.price = existingProduct.price;
        }
        if (existingProduct.dimensions) {
            product.dimensions = existingProduct.dimensions;
        }
        if (existingProduct.featured !== undefined) {
            product.featured = existingProduct.featured;
        }
        if (existingProduct.available !== undefined) {
            product.available = existingProduct.available;
        }
    }

    return product;
}

function saveProducts(products: Product[]): void {
    const data: ProductsData = {
        version: '1.0.0',
        last_updated: new Date().toISOString(),
        total_products: products.length,
        products: products.sort((a, b) => a.name.localeCompare(b.name)),
    };

    fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(data, null, 2));
    log.success(`Saved ${products.length} products to ${PRODUCTS_JSON_PATH}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function syncCatalog(): Promise<void> {
    console.log('\n🌳 Oak\'s Forge 3D - Catalog Sync\n');
    console.log('='.repeat(50) + '\n');

    // Validate API key
    if (!API_KEY || API_KEY === 'n3d_sk_your_key_here') {
        log.error('No API key configured!');
        log.error('Please set N3D_API_KEY in .env.local');
        log.info('Get your key at: https://n3dmelbourne.com → Dashboard → Tools → Design API');
        process.exit(1);
    }

    log.info(`API Key loaded: ${API_KEY.substring(0, 15)}...`);

    // Setup
    ensureDirectories();
    const existingProducts = loadExistingProducts();
    const blocklist = loadBlocklist();

    // Fetch all designs
    let designs = await fetchAllDesigns();

    // Filter out blocked designs
    const originalCount = designs.length;
    designs = designs.filter(d => !blocklist.has(d.slug));
    if (originalCount !== designs.length) {
        log.info(`Filtered out ${originalCount - designs.length} blocked products`);
    }

    // Process each design
    const products: Product[] = [];
    let imagesDownloaded = 0;
    let imagesSkipped = 0;

    for (let i = 0; i < designs.length; i++) {
        const design = designs[i];
        const existing = existingProducts.get(design.slug);

        // Handle image
        let imagePath: string;
        if (imageExists(design.slug)) {
            const extensions = ['.webp', '.jpg', '.jpeg', '.png'];
            const ext = extensions.find(e =>
                fs.existsSync(path.join(IMAGES_DIR, `${design.slug}${e}`))
            ) || '.webp';
            imagePath = `/images/products/${design.slug}${ext}`;
            imagesSkipped++;
        } else {
            log.progress(i + 1, designs.length, `Downloading image: ${design.slug}`);
            imagePath = await downloadImage(design.image_url, design.slug);
            imagesDownloaded++;
            await sleep(500);
        }

        // Fetch Pokemon data for character designs
        let pokemonData: N3DDesignFull['pokemon'] | undefined;
        if (design.category === 'character' && !existing?.pokemon_name) {
            try {
                log.progress(i + 1, designs.length, `Fetching details: ${design.slug}`);
                const details = await fetchDesignDetails(design.slug);
                pokemonData = details.pokemon;
                await sleep(RATE_LIMIT_DELAY_MS);
            } catch (error) {
                log.warn(`Could not fetch details for ${design.slug}: ${error}`);
            }
        } else if (existing?.pokemon_name) {
            pokemonData = {
                name: existing.pokemon_name,
                pokedex_number: existing.pokedex_number || 0,
                types: existing.pokemon_types || [],
                description: existing.pokemon_description || null,
            };
        }

        const product = transformDesign(design, existing, imagePath, pokemonData);
        products.push(product);

        if ((i + 1) % 10 === 0) {
            log.progress(i + 1, designs.length, 'Processing designs...');
        }
    }

    saveProducts(products);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Sync Summary:\n');
    console.log(`   Total products: ${products.length}`);
    console.log(`   Images downloaded: ${imagesDownloaded}`);
    console.log(`   Images preserved: ${imagesSkipped}`);
    console.log(`   Character designs: ${products.filter(p => p.category === 'character').length}`);
    console.log(`   Standard designs: ${products.filter(p => p.category === 'standard').length}`);
    console.log('\n✅ Sync complete!\n');
}

// Run
syncCatalog().catch((error) => {
    log.error(`Sync failed: ${error.message}`);
    process.exit(1);
});
