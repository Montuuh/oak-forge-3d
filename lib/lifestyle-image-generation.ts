import type { GenerationImageInputs } from "@/lib/ai-image-inputs";
import { generateLifestyleImage } from "@/lib/google-ai-images";
import {
    getImageGenerationProvider,
    type ImageGenerationProvider,
} from "@/lib/image-generation-provider";
import { generateLifestyleImageViaVertex } from "@/lib/vertex-ai-images";

export type { ImageGenerationProvider } from "@/lib/image-generation-provider";
export {
    getImageGenerationProvider,
    getImageGenerationProviderSummary,
} from "@/lib/image-generation-provider";

export type GeneratedLifestyleImage = {
    buffer: Buffer;
    contentType: string;
    model: string;
    provider: ImageGenerationProvider;
};

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
