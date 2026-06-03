import * as fs from "fs";
import * as path from "path";
import type { QueueEntry, QueueFile } from "@/lib/ai-image-queue-types";

const QUEUE_JSON_PATH = path.join(process.cwd(), "data", "ai-image-queue.json");

export function getQueueFilePath(): string {
    return QUEUE_JSON_PATH;
}

export function readAiImageQueueOptional(): QueueFile | null {
    if (!fs.existsSync(QUEUE_JSON_PATH)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(QUEUE_JSON_PATH, "utf-8")) as QueueFile;
    } catch {
        return null;
    }
}

export function readAiImageQueue(): QueueFile {
    const queue = readAiImageQueueOptional();
    if (!queue) {
        throw new Error('No existe data/ai-image-queue.json. Ejecuta "npm run ai:queue:pilot".');
    }
    return queue;
}

export function writeAiImageQueue(queue: QueueFile): void {
    queue.generated_at = new Date().toISOString();
    queue.total_items = queue.items.length;
    fs.writeFileSync(QUEUE_JSON_PATH, `${JSON.stringify(queue, null, 2)}\n`, "utf-8");
}

export function getPilotSlugs(): string[] {
    const queue = readAiImageQueue();
    return queue.items.map((item) => item.slug);
}

export function findQueueEntry(slug: string): QueueEntry | undefined {
    const queue = readAiImageQueueOptional();
    return queue?.items.find((item) => item.slug === slug);
}

/** Actualiza la cola local sin fallar el flujo principal (p. ej. delete en admin). */
export function trySyncQueueRemoveCandidate(slug: string, candidateId: string): void {
    try {
        if (!findQueueEntry(slug)) return;
        upsertQueueEntry((queue) => {
            const entry = queue.items.find((item) => item.slug === slug);
            if (!entry) return;
            entry.candidates = entry.candidates.filter((c) => c.id !== candidateId);
            if (entry.approved_candidate_id === candidateId) {
                entry.approved_candidate_id = undefined;
                entry.status = entry.candidates.length
                    ? "generated_pending_review"
                    : "pending_generation";
            }
        });
    } catch (error) {
        console.warn(`No se pudo actualizar ai-image-queue.json al eliminar ${candidateId}:`, error);
    }
}

export function upsertQueueEntry(mutator: (queue: QueueFile) => void): QueueFile {
    const queue = readAiImageQueue();
    mutator(queue);
    writeAiImageQueue(queue);
    return queue;
}
