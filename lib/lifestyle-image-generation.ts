import type { GenerationImageInputs } from "@/lib/ai-image-inputs";
import { generateLifestyleImage } from "@/lib/google-ai-images";
import { generateLifestyleImageViaVertex } from "@/lib/vertex-ai-images";

export type ImageGenerationProvider = "aistudio" | "vertex";

export type GeneratedLifestyleImage = {
    buffer: Buffer;
    contentType: string;
    model: string;
    provider: ImageGenerationProvider;
};

export function getImageGenerationProvider(): ImageGenerationProvider {
    const value = process.env.IMAGE_PROVIDER?.trim().toLowerCase();
    if (value === "vertex") return "vertex";
    return "aistudio";
}

export function getImageGenerationProviderSummary(): string {
    if (getImageGenerationProvider() === "vertex") {
        const project = process.env.GOOGLE_CLOUD_PROJECT?.trim() || "?";
        const location =
            process.env.GOOGLE_CLOUD_LOCATION?.trim() ||
            process.env.VERTEX_LOCATION?.trim() ||
            "europe-west1";
        const backend = process.env.VERTEX_IMAGE_BACKEND?.trim() || "gemini";
        const model =
            process.env.VERTEX_IMAGE_MODEL?.trim() ||
            (backend === "imagen" ? "imagen-3.0-generate-002" : "gemini-2.5-flash-image");
        return `Vertex AI · ${project} @ ${location} · ${model}`;
    }

    const backend = process.env.GOOGLE_IMAGE_BACKEND?.trim() || "imagen";
    const model = process.env.GOOGLE_IMAGE_MODEL?.trim() || "(default)";
    return `AI Studio · ${backend} · ${model}`;
}

/** Punto unico para admin: elige proveedor segun IMAGE_PROVIDER en .env.local */
export async function generateLifestyleImageForAdmin(
    prompt: string,
    inputs?: GenerationImageInputs,
    options?: { promptVersion?: string },
): Promise<GeneratedLifestyleImage> {
    if (getImageGenerationProvider() === "vertex") {
        const result = await generateLifestyleImageViaVertex(prompt, inputs, undefined, options);
        return {
            buffer: result.buffer,
            contentType: result.contentType,
            model: `${result.backend}:${result.model}`,
            provider: "vertex",
        };
    }

    const result = await generateLifestyleImage(prompt, inputs, options);
    return {
        buffer: result.buffer,
        contentType: result.contentType,
        model: result.model,
        provider: "aistudio",
    };
}
