import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { importLocalProductImageFromUrl } from "@/lib/admin-images";
import { assertAdminRequest } from "@/lib/admin-session";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const body = (await request.json()) as {
            productId?: string;
            imageUrl?: string;
            title?: string;
            sourcePage?: string;
        };

        const productId = body.productId?.trim();
        const imageUrl = body.imageUrl?.trim();

        if (!productId) {
            return NextResponse.json({ error: "Falta productId." }, { status: 400 });
        }
        if (!imageUrl) {
            return NextResponse.json({ error: "Falta imageUrl." }, { status: 400 });
        }

        const image = await importLocalProductImageFromUrl(productId, imageUrl, {
            title: body.title,
            sourcePage: body.sourcePage,
        });

        const product = await db.product.findUnique({
            where: { id: productId },
            select: { slug: true },
        });

        revalidatePath("/admin/products");
        if (product?.slug) {
            revalidatePath(`/admin/products/${product.slug}`);
        }

        return NextResponse.json({ ok: true, imageId: image.id, imagePath: image.imagePath });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}
