import type { AssetReviewStatus } from "@/types/product";

export type QueueCandidate = {
    id: string;
    image_path: string;
    prompt: string;
    model?: string;
    generated_at: string;
};

export type QueueEntry = {
    slug: string;
    product_name: string;
    status: AssetReviewStatus;
    prompt_version: string;
    style: "lifestyle_scene";
    requested_candidates: number;
    candidates: QueueCandidate[];
    approved_candidate_id?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    notes?: string;
};

export type QueueFile = {
    version: string;
    generated_at: string;
    total_items: number;
    items: QueueEntry[];
};
