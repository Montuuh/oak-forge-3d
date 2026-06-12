import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorageBucketName, getSupabaseAdmin } from "@/lib/supabase-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    const auth = request.headers.get("authorization");
    return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
    if (!isAuthorizedCronRequest(request)) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        await db.$queryRaw`SELECT 1`;

        const supabase = getSupabaseAdmin();
        const { error: storageError } = await supabase.storage.getBucket(getStorageBucketName());
        if (storageError) {
            throw new Error(`Storage ping failed: ${storageError.message}`);
        }

        return NextResponse.json({ ok: true, ts: new Date().toISOString() });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Keep-alive failed";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
