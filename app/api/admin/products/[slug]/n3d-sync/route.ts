import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { assertAdminRequest } from "@/lib/admin-session";
import { db } from "@/lib/db";
import {
    applyN3dSyncChoices,
    buildN3dSyncPreviewForProduct,
    type N3dSyncChoice,
    type N3dSyncFieldKey,
} from "@/lib/n3d-product-sync";

export const runtime = "nodejs";

type RouteContext = { params: { slug: string } };

const FIELD_KEYS = new Set<string>([
    "name",
    "category",
    "n3dSlug",
    "printTime",
    "printTimeSeconds",
    "weightGrams",
    "pokemonName",
    "pokedexNumber",
    "pokemonTypes",
    "longDescription",
    "filaments",
    "n3dImage",
]);

function parseChoices(raw: unknown): Partial<Record<N3dSyncFieldKey, N3dSyncChoice>> {
    if (!raw || typeof raw !== "object") return {};
    const out: Partial<Record<N3dSyncFieldKey, N3dSyncChoice>> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!FIELD_KEYS.has(key)) continue;
        if (value === "old" || value === "new") {
            out[key as N3dSyncFieldKey] = value;
        }
    }
    return out;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        assertAdminRequest(request);
        const slug = params.slug?.trim();
        if (!slug) {
            return NextResponse.json({ error: "Slug requerido." }, { status: 400 });
        }

        const product = await db.product.findUnique({ where: { slug } });
        if (!product) {
            return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
        }

        const body = (await request.json()) as { mode?: string; choices?: unknown };
        const mode = body.mode === "apply" ? "apply" : "preview";

        if (mode === "preview") {
            const preview = await buildN3dSyncPreviewForProduct(product);
            return NextResponse.json({ ok: true, preview });
        }

        await applyN3dSyncChoices({
            productId: product.id,
            slug: product.slug,
            choices: parseChoices(body.choices),
        });

        revalidatePath("/admin/products");
        revalidatePath(`/admin/products/${slug}`);
        revalidatePath("/");
        revalidatePath(`/products/${slug}`);

        return NextResponse.json({ ok: true });
    } catch (error) {
        return adminApiErrorResponse(error, 400);
    }
}
