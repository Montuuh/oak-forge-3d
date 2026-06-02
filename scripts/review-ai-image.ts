import * as fs from 'fs';
import * as path from 'path';
import type { Product, ProductsData, AssetReviewStatus, ProductAiAsset } from '../types/product';

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
const DEFAULT_REVIEWER = 'dmont';

function getArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(flag: string): boolean {
    return process.argv.includes(`--${flag}`);
}

function readQueue(): QueueFile {
    if (!fs.existsSync(QUEUE_JSON_PATH)) {
        throw new Error('Queue file not found. Run "npm run ai:queue" first.');
    }

    return JSON.parse(fs.readFileSync(QUEUE_JSON_PATH, 'utf-8')) as QueueFile;
}

function readProductsData(): ProductsData {
    return JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf-8')) as ProductsData;
}

function writeQueue(queue: QueueFile): void {
    queue.generated_at = new Date().toISOString();
    queue.total_items = queue.items.length;
    fs.writeFileSync(QUEUE_JSON_PATH, JSON.stringify(queue, null, 2));
}

function writeProducts(data: ProductsData): void {
    data.last_updated = new Date().toISOString();
    fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(data, null, 2));
}

function findProduct(products: Product[], slug: string): Product {
    const product = products.find((item) => item.slug === slug);
    if (!product) {
        throw new Error(`Product not found for slug "${slug}"`);
    }
    return product;
}

function approve(
    entry: QueueEntry,
    candidateId: string,
    reviewer: string,
    product: Product
): void {
    const candidate = entry.candidates.find((item) => item.id === candidateId);
    if (!candidate) {
        throw new Error(`Candidate "${candidateId}" not found for slug "${entry.slug}"`);
    }

    const now = new Date().toISOString();
    entry.status = 'approved';
    entry.approved_candidate_id = candidate.id;
    entry.reviewed_by = reviewer;
    entry.reviewed_at = now;

    const aiAsset: ProductAiAsset = {
        status: 'approved',
        source_model: candidate.model,
        prompt_version: entry.prompt_version,
        generated_at: candidate.generated_at,
        reviewed_at: now,
        reviewed_by: reviewer,
        approved_image_path: candidate.image_path,
    };

    product.ai_asset = aiAsset;
    product.image_source = 'ai-generated';
    product.image_path = candidate.image_path;
}

function reject(entry: QueueEntry, reviewer: string, product: Product, note?: string): void {
    entry.status = 'rejected';
    entry.reviewed_by = reviewer;
    entry.reviewed_at = new Date().toISOString();
    entry.notes = note || entry.notes;

    product.ai_asset = {
        status: 'rejected',
        reviewed_by: reviewer,
        reviewed_at: entry.reviewed_at,
    };
    product.image_source = 'n3d-local';
}

function main(): void {
    const slug = getArg('slug');
    const reviewer = getArg('reviewer') || DEFAULT_REVIEWER;
    const candidateId = getArg('candidate');
    const note = getArg('note');
    const shouldApprove = hasFlag('approve');
    const shouldReject = hasFlag('reject');

    if (!slug) {
        throw new Error('Missing required argument --slug=<product-slug>');
    }

    if (Number(shouldApprove) + Number(shouldReject) !== 1) {
        throw new Error('Choose exactly one action: --approve or --reject');
    }

    const queue = readQueue();
    const productsData = readProductsData();
    const entry = queue.items.find((item) => item.slug === slug);
    if (!entry) {
        throw new Error(`Queue entry not found for slug "${slug}"`);
    }

    const product = findProduct(productsData.products, slug);

    if (shouldApprove) {
        if (!candidateId) {
            throw new Error('Approvals require --candidate=<candidate-id>');
        }
        approve(entry, candidateId, reviewer, product);
    } else {
        reject(entry, reviewer, product, note);
    }

    writeQueue(queue);
    writeProducts(productsData);
    console.log(`Review updated for ${slug}. New status: ${entry.status}`);
}

main();
