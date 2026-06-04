import { NextRequest, NextResponse } from "next/server";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import {
    backlogSearchParamsToRecord,
    countBacklogByStatus,
    createBacklogItem,
    getBacklogMeta,
    listBacklogCategories,
    listBacklogItems,
    parseBacklogListQuery,
} from "@/lib/admin-backlog";
import type { BacklogPriority, BacklogStatus } from "@/lib/admin-backlog-types";
import { assertAdminRequest } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const query = parseBacklogListQuery(
            backlogSearchParamsToRecord(request.nextUrl.searchParams),
        );
        const [items, counts, categories, meta] = await Promise.all([
            listBacklogItems(query),
            countBacklogByStatus(),
            listBacklogCategories(),
            getBacklogMeta(),
        ]);
        return NextResponse.json({
            ok: true,
            items,
            counts,
            categories,
            query,
            updatedAt: meta.updatedAt,
            total: meta.total,
        });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const body = (await request.json()) as {
            title?: string;
            description?: string;
            category?: string;
            priority?: BacklogPriority;
            status?: BacklogStatus;
        };

        const item = await createBacklogItem({
            title: body.title ?? "",
            description: body.description,
            category: body.category,
            priority: body.priority,
            status: body.status,
        });

        return NextResponse.json({ ok: true, item, counts: await countBacklogByStatus() });
    } catch (error) {
        return adminApiErrorResponse(error, 400);
    }
}
