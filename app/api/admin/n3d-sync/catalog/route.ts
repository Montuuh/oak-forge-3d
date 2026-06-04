import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { assertAdminRequest } from "@/lib/admin-session";
import { runN3dImportNew, runN3dMassOverwrite } from "@/lib/n3d-catalog-sync";
import {
    encodeN3dStreamEvent,
    type N3dCatalogStreamEvent,
    type N3dCatalogSyncMode,
    type N3dSyncLogLevel,
} from "@/lib/n3d-sync-log";

export const runtime = "nodejs";
export const maxDuration = 300;

function startCatalogSyncStream(mode: N3dCatalogSyncMode): ReadableStream<Uint8Array> {
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    const enqueue = async (event: N3dCatalogStreamEvent) => {
        await writer.write(encodeN3dStreamEvent(event));
    };

    void (async () => {
        try {
            const onLog = async (message: string, level: N3dSyncLogLevel = "info") => {
                await enqueue({ type: "log", at: Date.now(), level, message });
            };

            const result =
                mode === "import-new"
                    ? await runN3dImportNew({ onLog })
                    : await runN3dMassOverwrite({ onLog });

            revalidatePath("/");
            revalidatePath("/admin/products");

            await enqueue({ type: "done", mode, result });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Error en sincronización.";
            await enqueue({ type: "error", message });
        } finally {
            await writer.close();
        }
    })();

    return readable;
}

export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const body = (await request.json()) as { mode?: string };
        const mode: N3dCatalogSyncMode =
            body.mode === "import-new" ? "import-new" : "overwrite-all";

        const stream = startCatalogSyncStream(mode);

        return new Response(stream, {
            headers: {
                "Content-Type": "application/x-ndjson; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        return adminApiErrorResponse(error, 400);
    }
}
