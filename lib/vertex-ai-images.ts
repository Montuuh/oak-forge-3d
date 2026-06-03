import { GoogleGenAI } from "@google/genai";
import type { GenerationImageInputs } from "@/lib/ai-image-inputs";
import { buildGeminiImageGenerationParts } from "@/lib/gemini-image-parts";

export type VertexGeneratedImage = {
    buffer: Buffer;
    contentType: string;
    model: string;
    backend: "vertex-imagen" | "vertex-gemini";
};

const DEFAULT_VERTEX_GEMINI_MODEL = "gemini-2.5-flash-image";
const DEFAULT_VERTEX_IMAGEN_MODEL = "imagen-3.0-generate-002";

export type VertexImageConfig = {
    project: string;
    location: string;
    backend: "imagen" | "gemini";
    model: string;
};

function getVertexImageBackend(): "imagen" | "gemini" {
    const value = process.env.VERTEX_IMAGE_BACKEND?.trim().toLowerCase();
    if (value === "imagen") return "imagen";
    return "gemini";
}

function isGeminiImageModel(model: string): boolean {
    return model.startsWith("gemini");
}

function isImagenModel(model: string): boolean {
    return model.startsWith("imagen");
}

function resolveVertexGeminiModel(): string {
    const override = process.env.VERTEX_GEMINI_IMAGE_MODEL?.trim();
    if (override) return override;

    const shared = process.env.VERTEX_IMAGE_MODEL?.trim();
    if (shared && isGeminiImageModel(shared)) return shared;

    return DEFAULT_VERTEX_GEMINI_MODEL;
}

function resolveVertexImagenModel(): string {
    const override = process.env.VERTEX_IMAGEN_MODEL?.trim();
    if (override) return override;

    const shared = process.env.VERTEX_IMAGE_MODEL?.trim();
    if (shared && isImagenModel(shared)) return shared;

    return DEFAULT_VERTEX_IMAGEN_MODEL;
}

export function getVertexImageConfig(): VertexImageConfig {
    const project =
        process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
        process.env.GCP_PROJECT?.trim() ||
        process.env.GCLOUD_PROJECT?.trim();
    if (!project) {
        throw new Error(
            "Configura GOOGLE_CLOUD_PROJECT en .env.local (ID del proyecto GCP con Vertex AI y billing).",
        );
    }

    const location =
        process.env.GOOGLE_CLOUD_LOCATION?.trim() ||
        process.env.VERTEX_LOCATION?.trim() ||
        "europe-west1";

    const backend = getVertexImageBackend();
    const model =
        backend === "gemini" ? resolveVertexGeminiModel() : resolveVertexImagenModel();

    return { project, location, backend, model };
}

export function createVertexGenAIClient(config?: Pick<VertexImageConfig, "project" | "location">): GoogleGenAI {
    const project =
        config?.project ||
        process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
        process.env.GCP_PROJECT?.trim();
    const location =
        config?.location ||
        process.env.GOOGLE_CLOUD_LOCATION?.trim() ||
        process.env.VERTEX_LOCATION?.trim() ||
        "europe-west1";

    if (!project) {
        throw new Error("Falta GOOGLE_CLOUD_PROJECT para Vertex AI.");
    }

    return new GoogleGenAI({
        vertexai: true,
        project,
        location,
    });
}

function wrapVertexError(error: unknown): Error {
    const raw = error instanceof Error ? error.message : String(error);
    if (/Could not load the default credentials/i.test(raw)) {
        return new Error(
            "Sin credenciales GCP. Ejecuta `gcloud auth application-default login` o define GOOGLE_APPLICATION_CREDENTIALS.",
        );
    }
    if (/PERMISSION_DENIED|403/i.test(raw)) {
        return new Error(
            "Permiso denegado en Vertex AI. Activa la API aiplatform.googleapis.com y asigna rol Vertex AI User.",
        );
    }
    if (/billing|BILLING/i.test(raw)) {
        return new Error(
            "Billing no activo en el proyecto GCP. Los creditos promocionales ($10 AI Pro) se consumen aqui, no en AI Studio Prepay.",
        );
    }
    return error instanceof Error ? error : new Error(raw);
}

async function generateWithVertexImagen(
    ai: GoogleGenAI,
    prompt: string,
    model: string,
): Promise<VertexGeneratedImage> {
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
            throw new Error("Vertex Imagen no devolvio ninguna imagen.");
        }

        return {
            buffer: Buffer.from(bytes, "base64"),
            contentType: "image/png",
            model,
            backend: "vertex-imagen",
        };
    } catch (error) {
        throw wrapVertexError(error);
    }
}

async function generateWithVertexGeminiImage(
    ai: GoogleGenAI,
    prompt: string,
    model: string,
    inputs?: GenerationImageInputs,
    options?: { promptVersion?: string },
): Promise<VertexGeneratedImage> {
    try {
        const parts = buildGeminiImageGenerationParts(prompt, inputs, options?.promptVersion);

        const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts }],
            config: {
                responseModalities: ["IMAGE"],
            },
        });

        const responseParts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of responseParts) {
            const inline = part.inlineData;
            if (inline?.data) {
                return {
                    buffer: Buffer.from(inline.data, "base64"),
                    contentType: inline.mimeType || "image/png",
                    model,
                    backend: "vertex-gemini",
                };
            }
        }

        throw new Error("Vertex Gemini no devolvio imagen en la respuesta.");
    } catch (error) {
        throw wrapVertexError(error);
    }
}

/** Generacion via Vertex AI (GCP billing / creditos promocionales). Paralelo a lib/google-ai-images.ts */
export async function generateLifestyleImageViaVertex(
    prompt: string,
    inputs?: GenerationImageInputs,
    client?: GoogleGenAI,
    options?: { promptVersion?: string },
): Promise<VertexGeneratedImage> {
    const config = getVertexImageConfig();
    const ai = client ?? createVertexGenAIClient(config);

    if (config.backend === "gemini") {
        return generateWithVertexGeminiImage(ai, prompt, config.model, inputs, options);
    }

    if ((inputs?.references?.length ?? 0) > 0) {
        throw new Error(
            "Vertex Imagen (texto solo) ignora las imagenes de referencia. " +
                "Usa VERTEX_IMAGE_BACKEND=gemini en .env.local.",
        );
    }

    return generateWithVertexImagen(ai, prompt, config.model);
}
