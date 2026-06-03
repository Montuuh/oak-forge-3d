import { NextRequest, NextResponse } from "next/server";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { assertAdminRequest } from "@/lib/admin-session";
import { isValidStoredImagePath } from "@/lib/catalog-image";
import { db } from "@/lib/db";
import {
    getStorageBucketName,
    getSupabaseAdmin,
    objectPathFromPublicUrl,
} from "@/lib/supabase-storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const imageId = request.nextUrl.searchParams.get("id");
        if (!imageId) {
            return NextResponse.json({ error: "Falta id." }, { status: 400 });
        }

        const image = await db.productImage.findUnique({ where: { id: imageId } });
        if (!image || !isValidStoredImagePath(image.imagePath)) {
            return NextResponse.json({ error: "Imagen no encontrada." }, { status: 404 });
        }

        const objectPath = objectPathFromPublicUrl(image.imagePath);
        if (!objectPath) {
            return NextResponse.json({ error: "Ruta de storage invalida." }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const bucket = getStorageBucketName();
        const { data, error } = await supabase.storage.from(bucket).download(objectPath);

        if (error || !data) {
            return NextResponse.json(
                { error: error?.message || "No se pudo descargar la imagen." },
                { status: 404 },
            );
        }

        const buffer = Buffer.from(await data.arrayBuffer());
        const contentType = data.type || "image/png";

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}
