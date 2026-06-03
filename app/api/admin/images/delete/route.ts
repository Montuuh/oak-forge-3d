import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { deleteProductImage } from "@/lib/admin-images";
import { assertAdminRequest } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const body = (await request.json()) as { imageId?: string };
        if (!body.imageId) {
            return NextResponse.json({ error: "Falta imageId." }, { status: 400 });
        }

        const result = await deleteProductImage(body.imageId);
        revalidatePath("/admin/products");
        revalidatePath(`/admin/products/${result.productSlug}`);
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}
