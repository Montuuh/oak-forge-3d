import { isV7PromptVersion } from "@/lib/ai-image-prompt-versions";

const VALID_ASPECT_RATIOS = new Set([
    "1:1",
    "2:3",
    "3:2",
    "3:4",
    "4:3",
    "4:5",
    "5:4",
    "9:16",
    "16:9",
    "21:9",
]);

const VALID_IMAGE_SIZES = new Set(["1K", "2K", "4K"]);

export function resolveGeminiOutputAspectRatio(promptVersion?: string | null): string {
    const override = process.env.GEMINI_IMAGE_ASPECT_RATIO?.trim();
    if (override && VALID_ASPECT_RATIOS.has(override)) {
        return override;
    }
    if (promptVersion && isV7PromptVersion(promptVersion)) {
        const v7Default = process.env.V7_IMAGE_ASPECT_RATIO?.trim();
        if (v7Default && VALID_ASPECT_RATIOS.has(v7Default)) {
            return v7Default;
        }
        return "4:3";
    }
    return "4:3";
}

export function resolveGeminiOutputImageSize(): string | undefined {
    const raw = process.env.GEMINI_IMAGE_SIZE?.trim().toUpperCase();
    if (!raw) return "2K";
    if (VALID_IMAGE_SIZES.has(raw)) return raw;
    return "2K";
}

/** Config para generateContent con salida de imagen (Vertex / AI Studio). */
export function buildGeminiImageGenerateContentConfig(options?: {
    promptVersion?: string | null;
}) {
    const aspectRatio = resolveGeminiOutputAspectRatio(options?.promptVersion);
    const imageSize = resolveGeminiOutputImageSize();

    return {
        responseModalities: ["IMAGE"],
        imageConfig: {
            aspectRatio,
            imageSize,
        },
    };
}
