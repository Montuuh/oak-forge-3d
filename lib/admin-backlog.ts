import { randomUUID } from "crypto";
import type { BacklogPriority, BacklogStatus, BacklogTask } from "@prisma/client";
import type {
    BacklogItem,
    BacklogListQuery,
    BacklogSortField,
    BacklogSortOrder,
} from "@/lib/admin-backlog-types";
import { db } from "@/lib/db";

const PRIORITY_ORDER: Record<BacklogPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
};

const STATUS_ORDER: Record<BacklogStatus, number> = {
    in_progress: 0,
    pending: 1,
    done: 2,
    cancelled: 3,
};

function toBacklogItem(row: BacklogTask): BacklogItem {
    return {
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        category: row.category,
        status: row.status,
        priority: row.priority,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function sortBacklogRows(
    rows: BacklogTask[],
    sort: BacklogSortField = "priority",
    order: BacklogSortOrder = "asc",
): BacklogTask[] {
    const dir = order === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
        let cmp = 0;
        switch (sort) {
            case "priority":
                cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
                break;
            case "status":
                cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
                break;
            case "category":
                cmp = a.category.localeCompare(b.category, "es");
                break;
            case "title":
                cmp = a.title.localeCompare(b.title, "es");
                break;
            case "createdAt":
                cmp = a.createdAt.getTime() - b.createdAt.getTime();
                break;
            case "updatedAt":
                cmp = a.updatedAt.getTime() - b.updatedAt.getTime();
                break;
            default:
                cmp = 0;
        }
        if (cmp !== 0) return cmp * dir;
        return a.title.localeCompare(b.title, "es");
    });
}

export function parseBacklogListQuery(
    input: Record<string, string | string[] | undefined>,
): BacklogListQuery {
    const pick = (key: string) => {
        const value = input[key];
        return typeof value === "string" ? value : undefined;
    };

    const status = pick("status");
    const priority = pick("priority");
    const sort = pick("sort");
    const order = pick("order");

    return {
        status:
            status === "pending" ||
            status === "in_progress" ||
            status === "done" ||
            status === "cancelled"
                ? status
                : "all",
        priority:
            priority === "high" || priority === "medium" || priority === "low"
                ? priority
                : "all",
        category: pick("category") || "all",
        q: pick("q")?.trim() || undefined,
        sort:
            sort === "priority" ||
            sort === "status" ||
            sort === "category" ||
            sort === "title" ||
            sort === "createdAt" ||
            sort === "updatedAt"
                ? sort
                : "priority",
        order: order === "desc" ? "desc" : "asc",
    };
}

export async function listBacklogItems(query: BacklogListQuery = {}): Promise<BacklogItem[]> {
    const status = query.status ?? "all";
    const priority = query.priority ?? "all";
    const category = query.category ?? "all";
    const sort = query.sort ?? "priority";
    const order = query.order ?? "asc";
    const q = query.q?.trim();

    const rows = await db.backlogTask.findMany({
        where: {
            ...(status !== "all" ? { status } : {}),
            ...(priority !== "all" ? { priority } : {}),
            ...(category !== "all" ? { category } : {}),
            ...(q
                ? {
                      OR: [
                          { title: { contains: q, mode: "insensitive" } },
                          { description: { contains: q, mode: "insensitive" } },
                          { category: { contains: q, mode: "insensitive" } },
                          { id: { contains: q, mode: "insensitive" } },
                      ],
                  }
                : {}),
        },
    });

    return sortBacklogRows(rows, sort, order).map(toBacklogItem);
}

export async function listBacklogCategories(): Promise<string[]> {
    const rows = await db.backlogTask.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
    });
    return rows.map((row) => row.category);
}

export async function getBacklogMeta(): Promise<{ updatedAt: string; total: number }> {
    const [latest, total] = await Promise.all([
        db.backlogTask.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
        db.backlogTask.count(),
    ]);
    return {
        updatedAt: latest?.updatedAt.toISOString() ?? new Date().toISOString(),
        total,
    };
}

export type CreateBacklogInput = {
    title: string;
    description?: string;
    category?: string;
    priority?: BacklogPriority;
    status?: BacklogStatus;
};

export async function createBacklogItem(input: CreateBacklogInput): Promise<BacklogItem> {
    const title = input.title.trim();
    if (!title) {
        throw new Error("El titulo es obligatorio.");
    }

    const now = new Date();
    const row = await db.backlogTask.create({
        data: {
            id: randomUUID(),
            title,
            description: input.description?.trim() || null,
            category: input.category?.trim() || "General",
            status: input.status ?? "pending",
            priority: input.priority ?? "medium",
            createdAt: now,
            updatedAt: now,
        },
    });
    return toBacklogItem(row);
}

export type UpdateBacklogInput = {
    title?: string;
    description?: string;
    category?: string;
    priority?: BacklogPriority;
    status?: BacklogStatus;
};

export async function updateBacklogItem(
    id: string,
    input: UpdateBacklogInput,
): Promise<BacklogItem> {
    const existing = await db.backlogTask.findUnique({ where: { id } });
    if (!existing) {
        throw new Error("Tarea no encontrada.");
    }

    if (input.title !== undefined) {
        const title = input.title.trim();
        if (!title) throw new Error("El titulo es obligatorio.");
    }

    const row = await db.backlogTask.update({
        where: { id },
        data: {
            ...(input.title !== undefined ? { title: input.title.trim() } : {}),
            ...(input.description !== undefined
                ? { description: input.description.trim() || null }
                : {}),
            ...(input.category !== undefined
                ? { category: input.category.trim() || "General" }
                : {}),
            ...(input.priority !== undefined ? { priority: input.priority } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            updatedAt: new Date(),
        },
    });
    return toBacklogItem(row);
}

export async function deleteBacklogItem(id: string): Promise<void> {
    try {
        await db.backlogTask.delete({ where: { id } });
    } catch {
        throw new Error("Tarea no encontrada.");
    }
}

export async function countBacklogByStatus(): Promise<Record<BacklogStatus, number>> {
    const groups = await db.backlogTask.groupBy({
        by: ["status"],
        _count: { _all: true },
    });

    const counts: Record<BacklogStatus, number> = {
        pending: 0,
        in_progress: 0,
        done: 0,
        cancelled: 0,
    };
    for (const group of groups) {
        counts[group.status] = group._count._all;
    }
    return counts;
}
