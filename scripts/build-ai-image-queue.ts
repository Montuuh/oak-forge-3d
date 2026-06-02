import * as fs from 'fs';
import * as path from 'path';
import type { Product, ProductsData, AssetReviewStatus } from '../types/product';

type CandidateAsset = {
    id: string;
    image_path: string;
    prompt: string;
    model?: string;
    generated_at: string;
};

type QueueEntry = {
    slug: string;
    product_name: string;
    status: AssetReviewStatus;
    prompt_version: string;
    style: 'lifestyle_scene';
    requested_candidates: number;
    candidates: CandidateAsset[];
    approved_candidate_id?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    notes?: string;
};

type QueueFile = {
    version: string;
    generated_at: string;
    total_items: number;
    items: QueueEntry[];
};

const PRODUCTS_JSON_PATH = path.join(process.cwd(), 'data', 'products.json');
const QUEUE_JSON_PATH = path.join(process.cwd(), 'data', 'ai-image-queue.json');
const AI_IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'products-ai');
const DEFAULT_PROMPT_VERSION = 'v1-lifestyle-real-print';

function parseLimitArg(): number | undefined {
    const arg = process.argv.find((value) => value.startsWith('--limit='));
    if (!arg) {
        return undefined;
    }

    const parsed = Number(arg.split('=')[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Invalid --limit argument. Example: --limit=10');
    }

    return Math.floor(parsed);
}

function ensureDirExists(targetPath: string): void {
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }
}

function readProducts(): Product[] {
    const raw = fs.readFileSync(PRODUCTS_JSON_PATH, 'utf-8');
    const data = JSON.parse(raw) as ProductsData;
    return data.products;
}

function readExistingQueue(): QueueFile | null {
    if (!fs.existsSync(QUEUE_JSON_PATH)) {
        return null;
    }
    const raw = fs.readFileSync(QUEUE_JSON_PATH, 'utf-8');
    return JSON.parse(raw) as QueueFile;
}

function buildPrompt(product: Product): string {
    return [
        'Generate a photorealistic lifestyle photo of a 3D printed decorative Pokeball-inspired collectible.',
        `Product name: ${product.name}.`,
        `Category: ${product.category}.`,
        'The object must look like a real PLA print: subtle layer lines, realistic lighting, physically plausible reflections, no warping.',
        'Scene: premium desk/shelf lifestyle setup, shallow depth of field, no text overlays, no logos, no watermarks.',
        'Do not copy any existing product photography. Produce an original composition.',
    ].join(' ');
}

function createQueueEntry(product: Product, existing?: QueueEntry): QueueEntry {
    if (existing) {
        return {
            ...existing,
            product_name: product.name,
        };
    }

    return {
        slug: product.slug,
        product_name: product.name,
        status: 'pending_generation',
        prompt_version: DEFAULT_PROMPT_VERSION,
        style: 'lifestyle_scene',
        requested_candidates: 5,
        candidates: [],
        notes: buildPrompt(product),
    };
}

function main(): void {
    const limit = parseLimitArg();
    ensureDirExists(AI_IMAGES_DIR);

    const products = readProducts();
    const subset = limit ? products.slice(0, limit) : products;
    const existingQueue = readExistingQueue();
    const existingMap = new Map(
        (existingQueue?.items ?? []).map((entry) => [entry.slug, entry])
    );

    const items = subset.map((product) =>
        createQueueEntry(product, existingMap.get(product.slug))
    );

    const queue: QueueFile = {
        version: '1.0.0',
        generated_at: new Date().toISOString(),
        total_items: items.length,
        items,
    };

    fs.writeFileSync(QUEUE_JSON_PATH, JSON.stringify(queue, null, 2));
    console.log(`AI queue written: ${QUEUE_JSON_PATH}`);
    console.log(`Items queued: ${queue.total_items}`);
    if (limit) {
        console.log(`Pilot mode enabled with limit=${limit}`);
    }
}

main();
