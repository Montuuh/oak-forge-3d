import { NextRequest, NextResponse } from "next/server";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { approveProductImage } from "@/lib/admin-images";
import { assertAdminRequest } from "@/lib/admin-session";

export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const body = (await request.json()) as { imageId?: string };
        if (!body.imageId) {
            return NextResponse.json({ error: "Falta imageId." }, { status: 400 });
        }

        const image = await approveProductImage(body.imageId);
        return NextResponse.json({ ok: true, image });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}
