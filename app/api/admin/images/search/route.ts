import { NextRequest, NextResponse } from "next/server";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { assertAdminRequest } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { buildReferenceImageSearchQuery } from "@/lib/image-search-query";
import { searchImageCandidates } from "@/lib/image-search";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const body = (await request.json()) as {
            productId?: string;
            query?: string;
        };

        const productId = body.productId?.trim();
        if (!productId) {
            return NextResponse.json({ error: "Falta productId." }, { status: 400 });
        }

        const product = await db.product.findUnique({ where: { id: productId } });
        if (!product) {
            return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
        }

        const query =
            body.query?.trim() ||
            buildReferenceImageSearchQuery({
                name: product.name,
                slug: product.slug,
                pokemonName: product.pokemonName,
            });

        const candidates = await searchImageCandidates(query);

        return NextResponse.json({ query, candidates });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}
