import { NextResponse } from "next/server";
import { AdminUnauthorizedError } from "@/lib/admin-session";
import { CandidateLimitError, N3dProtectedImageError } from "@/lib/admin-images";

export function adminApiErrorResponse(error: unknown, status = 500): NextResponse {
    if (error instanceof AdminUnauthorizedError) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (error instanceof CandidateLimitError) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Solicitud invalida." },
            { status: 400 },
        );
    }
    if (error instanceof N3dProtectedImageError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof SyntaxError && /json|unexpected token/i.test(error.message)) {
        return NextResponse.json(
            {
                error:
                    "Respuesta invalida del proveedor de busqueda. Revisa SERPER_API_KEY en .env.local " +
                    "y reinicia npm run dev.",
            },
            { status: 502 },
        );
    }
    const message = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ error: message }, { status });
}
