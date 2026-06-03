import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { setProductImageUseAsReference } from "@/lib/admin-images";
import { assertAdminRequest } from "@/lib/admin-session";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const body = (await request.json()) as {
            imageId?: string;
            useAsReference?: boolean;
        };

        if (!body.imageId || typeof body.useAsReference !== "boolean") {
            return NextResponse.json(
                { error: "Faltan imageId o useAsReference." },
                { status: 400 },
            );
        }

        const image = await setProductImageUseAsReference(body.imageId, body.useAsReference);

        const product = await db.product.findUnique({
            where: { id: image.productId },
            select: { slug: true },
        });

        revalidatePath("/admin/products");
        if (product?.slug) {
            revalidatePath(`/admin/products/${product.slug}`);
        }

        return NextResponse.json({ ok: true, image });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}
