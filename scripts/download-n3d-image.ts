import fs from "fs";
import path from "path";
import { putN3dRender } from "@/lib/product-image-storage";

const API_BASE_URL = "https://n3dmelbourne.com/api/v1";

function loadEnvLocal(): void {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const env = fs.readFileSync(envPath, "utf8");
    for (const line of env.split("\n")) {
        const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (!match) continue;
        const key = match[1];
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = value;
    }
}

function loadN3dApiKey(): string {
    const key = process.env.N3D_API_KEY?.trim();
    if (key) return key;
    throw new Error("N3D_API_KEY no encontrada en .env.local");
}

async function n3dApiRequest<T>(endpoint: string, apiKey: string): Promise<T> {
    let url = `${API_BASE_URL}${endpoint}`;
    let attempts = 0;

    while (attempts < 5) {
        const response = await fetch(url, {
            method: "GET",
            redirect: "manual",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: "application/json",
            },
        });

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("Location");
            if (!location) break;
            url = location.startsWith("http") ? location : new URL(location, url).href;
            attempts++;
            continue;
        }

        if (!response.ok) {
            throw new Error(`N3D API ${response.status}: ${await response.text()}`);
        }

        return (await response.json()) as T;
    }

    throw new Error("Demasiados redirects en la API N3D");
}

async function main() {
    loadEnvLocal();
    const slug = process.argv[2]?.trim() || "0001-bulbasaur";
    const apiKey = loadN3dApiKey();

    const design = await n3dApiRequest<{ image_url?: string }>(`/designs/${slug}`, apiKey);
    const imgUrl = design.image_url?.trim();
    if (!imgUrl) {
        throw new Error(`Sin image_url para ${slug}`);
    }

    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) {
        throw new Error(`Descarga imagen ${imgRes.status}`);
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get("content-type") || "image/webp";
    const publicUrl = await putN3dRender(slug, buffer, mimeType);

    console.log(
        JSON.stringify(
            {
                ok: true,
                slug,
                publicUrl,
                bytes: buffer.length,
            },
            null,
            2,
        ),
    );
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
