import fs from "fs";
import path from "path";

const API_BASE_URL = "https://n3dmelbourne.com/api/v1";

function loadN3dApiKey(): string {
    const envPath = path.join(process.cwd(), ".env.local");
    const env = fs.readFileSync(envPath, "utf8");
    const keyMatch = env.match(/N3D_API_KEY\s*=\s*([^\s\r\n]+)/);
    if (!keyMatch) {
        throw new Error("N3D_API_KEY no encontrada en .env.local");
    }
    return keyMatch[1].trim();
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
    const slug = process.argv[2]?.trim() || "0001-bulbasaur";
    const apiKey = loadN3dApiKey();

    const design = await n3dApiRequest<{ image_url?: string }>(
        `/designs/${slug}`,
        apiKey,
    );
    const imgUrl = design.image_url?.trim();
    if (!imgUrl) {
        throw new Error(`Sin image_url para ${slug}`);
    }

    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) {
        throw new Error(`Descarga imagen ${imgRes.status}`);
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "images", "products");
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(new URL(imgUrl).pathname) || ".webp";
    const filename = `${slug}${ext}`;
    const diskPath = path.join(dir, filename);
    fs.writeFileSync(diskPath, buffer);

    console.log(
        JSON.stringify(
            {
                ok: true,
                slug,
                diskPath,
                webPath: `/images/products/${filename}`,
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
