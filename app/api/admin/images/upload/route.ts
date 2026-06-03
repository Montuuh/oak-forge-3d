import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { uploadLocalProductImage } from "@/lib/admin-images";
import { assertAdminRequest } from "@/lib/admin-session";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const formData = await request.formData();
        const productId = String(formData.get("productId") || "");
        const file = formData.get("file");

        if (!productId) {
            return NextResponse.json({ error: "Falta productId." }, { status: 400 });
        }
        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Falta el archivo de imagen." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const image = await uploadLocalProductImage(productId, {
            buffer,
            mimeType: file.type || "image/webp",
            size: file.size,
        });

        const product = await db.product.findUnique({
            where: { id: productId },
            select: { slug: true },
        });

        revalidatePath("/admin/products");
        if (product?.slug) {
            revalidatePath(`/admin/products/${product.slug}`);
        }

        return NextResponse.json({ ok: true, imageId: image.id });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}
