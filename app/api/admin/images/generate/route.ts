import { NextRequest, NextResponse } from "next/server";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { generateCandidateForProduct } from "@/lib/admin-images";
import { assertAdminRequest } from "@/lib/admin-session";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const body = (await request.json()) as { productId?: string; promptVersion?: string };
        if (!body.productId) {
            return NextResponse.json({ error: "Falta productId." }, { status: 400 });
        }

        const image = await generateCandidateForProduct(body.productId, body.promptVersion);
        return NextResponse.json({ ok: true, image });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}
