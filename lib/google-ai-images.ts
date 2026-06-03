import { GoogleGenAI } from "@google/genai";
import type { GenerationImageInputs } from "@/lib/ai-image-inputs";
import { buildGeminiImageGenerationParts } from "@/lib/gemini-image-parts";
import { buildGeminiImageGenerateContentConfig } from "@/lib/gemini-image-generation-config";

export type GeneratedImage = {
    buffer: Buffer;
    contentType: string;
    model: string;
};

function getGeminiApiKey(): string {
    const key =
        process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim();
    if (!key) {
        throw new Error(
            "Configura GEMINI_API_KEY en .env.local (Google AI Studio → API Keys).",
        );
    }
    return key;
}

const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_IMAGEN_MODEL = "imagen-4.0-fast-generate-001";

function getImageBackend(): "imagen" | "gemini" {
    const value = process.env.GOOGLE_IMAGE_BACKEND?.trim().toLowerCase();
    if (value === "gemini") return "gemini";
    return "imagen";
}

export function getGoogleImageBackend(): "imagen" | "gemini" {
    return getImageBackend();
}

function isGeminiImageModel(model: string): boolean {
    return model.startsWith("gemini");
}

function isImagenModel(model: string): boolean {
    return model.startsWith("imagen");
}

/** Model for generateContent (references / Gemini backend). Ignores Imagen model IDs. */
function resolveGeminiImageModel(): string {
    const geminiOverride = process.env.GOOGLE_GEMINI_IMAGE_MODEL?.trim();
    if (geminiOverride) return geminiOverride;

    const shared = process.env.GOOGLE_IMAGE_MODEL?.trim();
    if (shared && isGeminiImageModel(shared)) return shared;

    return DEFAULT_GEMINI_IMAGE_MODEL;
}

/** Model for generateImages (text-only, no references). Ignores Gemini model IDs. */
function resolveImagenModel(): string {
    const imagenOverride = process.env.GOOGLE_IMAGEN_MODEL?.trim();
    if (imagenOverride) return imagenOverride;

    const shared = process.env.GOOGLE_IMAGE_MODEL?.trim();
    if (shared && isImagenModel(shared)) return shared;

    return DEFAULT_IMAGEN_MODEL;
}

function wrapGoogleAiError(error: unknown): Error {
    const raw = error instanceof Error ? error.message : String(error);
    try {
        const parsed = JSON.parse(raw) as {
            error?: { code?: number; message?: string };
        };
        const code = parsed.error?.code;
        const message = parsed.error?.message;
        if (code === 429 && message?.toLowerCase().includes("prepayment")) {
            return new Error(
                "Creditos prepago agotados en AI Studio. Recarga en https://ai.studio/projects — " +
                    "Google AI Pro (suscripcion) no cubre la API automaticamente; hay que vincular creditos GCP en My Benefits.",
            );
        }
        if (code === 400 && message?.toLowerCase().includes("paid plans")) {
            return new Error(
                "Imagen requiere plan de pago en el proyecto de la API key. Activa billing en https://ai.dev/projects",
            );
        }
        if (code === 429 && message?.toLowerCase().includes("quota")) {
            return new Error(
                "Cuota de imagen agotada (free tier limit: 0 en este proyecto). Activa billing en https://ai.dev/projects",
            );
        }
        if (message) return new Error(message);
    } catch {
        // raw no es JSON de Google
    }
    return error instanceof Error ? error : new Error(raw);
}

async function generateWithImagen(ai: GoogleGenAI, prompt: string, model: string): Promise<GeneratedImage> {
    try {
        const response = await ai.models.generateImages({
            model,
            prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: "image/png",
            },
        });

        const bytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!bytes) {
            throw new Error("Google Imagen no devolvio ninguna imagen. Revisa cuota o el modelo.");
        }

        return {
            buffer: Buffer.from(bytes, "base64"),
            contentType: "image/png",
            model,
        };
    } catch (error) {
        throw wrapGoogleAiError(error);
    }
}

async function generateWithGeminiImage(
    ai: GoogleGenAI,
    prompt: string,
    model: string,
    inputs?: GenerationImageInputs,
    options?: { promptVersion?: string },
): Promise<GeneratedImage> {
    try {
        const parts = buildGeminiImageGenerationParts(prompt, inputs, options?.promptVersion);

        const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts }],
            config: buildGeminiImageGenerateContentConfig(options),
        });

    const responseParts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of responseParts) {
        const inline = part.inlineData;
        if (inline?.data) {
            return {
                buffer: Buffer.from(inline.data, "base64"),
                contentType: inline.mimeType || "image/png",
                model,
            };
        }
    }

    throw new Error(
        "Gemini no devolvio imagen. Prueba GOOGLE_IMAGE_BACKEND=gemini o otro GOOGLE_IMAGE_MODEL.",
    );
    } catch (error) {
        throw wrapGoogleAiError(error);
    }
}

export async function generateLifestyleImage(
    prompt: string,
    inputs?: GenerationImageInputs,
    options?: { promptVersion?: string },
): Promise<GeneratedImage> {
    const apiKey = getGeminiApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const useGemini = getImageBackend() === "gemini";

    if (useGemini) {
        return generateWithGeminiImage(ai, prompt, resolveGeminiImageModel(), inputs, options);
    }

    if ((inputs?.references?.length ?? 0) > 0) {
        throw new Error(
            "Google Imagen (texto solo) ignora las imagenes de referencia. " +
                "Usa GOOGLE_IMAGE_BACKEND=gemini en .env.local.",
        );
    }

    return generateWithImagen(ai, prompt, resolveImagenModel());
}
