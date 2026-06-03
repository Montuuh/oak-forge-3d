import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { exportCatalogPublicJson } from "@/lib/catalog-export";
import { assertAdminRequest } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);

        const result = await exportCatalogPublicJson();

        revalidatePath("/");
        revalidatePath("/products/[slug]");

        return NextResponse.json({
            ok: true,
            productCount: result.productCount,
            placeholderCount: result.placeholderCount,
            lastUpdated: result.lastUpdated,
            message:
                result.productCount === 0
                    ? "Exportado: ningun producto visible en catalogo."
                    : `Exportado ${result.productCount} producto(s) a data/catalog-public.json.`,
        });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}
