import { NextRequest, NextResponse } from "next/server";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { countBacklogByStatus, deleteBacklogItem, updateBacklogItem } from "@/lib/admin-backlog";
import type { BacklogPriority, BacklogStatus } from "@/lib/admin-backlog-types";
import { assertAdminRequest } from "@/lib/admin-session";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        assertAdminRequest(request);
        const body = (await request.json()) as {
            title?: string;
            description?: string;
            category?: string;
            priority?: BacklogPriority;
            status?: BacklogStatus;
        };

        const item = await updateBacklogItem(params.id, body);
        return NextResponse.json({ ok: true, item, counts: await countBacklogByStatus() });
    } catch (error) {
        return adminApiErrorResponse(error, 400);
    }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        assertAdminRequest(request);
        await deleteBacklogItem(params.id);
        return NextResponse.json({ ok: true, counts: await countBacklogByStatus() });
    } catch (error) {
        return adminApiErrorResponse(error, 400);
    }
}
