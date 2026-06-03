import { NextRequest, NextResponse } from "next/server";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { assertAdminRequest } from "@/lib/admin-session";
import {
    clearCustomStudioSceneFile,
    getStudioSceneStatus,
    saveCustomStudioSceneFile,
} from "@/lib/studio-scene-reference";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
]);

export async function GET(request: NextRequest) {
    try {
        assertAdminRequest(request);
        return NextResponse.json({ ok: true, status: getStudioSceneStatus() });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        assertAdminRequest(request);
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Falta el archivo de escena." }, { status: 400 });
        }

        const mimeType = (file.type || "image/jpeg").toLowerCase();
        if (!ALLOWED_MIME.has(mimeType)) {
            return NextResponse.json(
                { error: "Formato no valido. Usa JPEG, PNG o WebP." },
                { status: 400 },
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const webPath = await saveCustomStudioSceneFile(buffer, mimeType);

        return NextResponse.json({
            ok: true,
            webPath,
            status: getStudioSceneStatus(),
        });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}

export async function DELETE(request: NextRequest) {
    try {
        assertAdminRequest(request);
        await clearCustomStudioSceneFile();
        return NextResponse.json({ ok: true, status: getStudioSceneStatus() });
    } catch (error) {
        return adminApiErrorResponse(error);
    }
}
