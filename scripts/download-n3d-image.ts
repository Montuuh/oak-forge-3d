import dotenv from "dotenv";
import { fetchN3dDesign } from "../lib/n3d-api";
import { putN3dRender } from "@/lib/product-image-storage";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
    const slug = process.argv[2]?.trim() || "0001-bulbasaur";

    const design = await fetchN3dDesign(slug);
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
