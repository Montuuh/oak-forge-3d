import { GoogleGenAI } from "@google/genai";
import type { GenerationImageInputs } from "@/lib/ai-image-inputs";
import { buildGeminiImageGenerationParts } from "@/lib/gemini-image-parts";
import { buildGeminiImageGenerateContentConfig } from "@/lib/gemini-image-generation-config";
import {
    hasGcpServiceAccountEnv,
    loadGcpServiceAccountCredentials,
} from "@/lib/gcp-credentials";

export type VertexGeneratedImage = {
    buffer: Buffer;
    contentType: string;
    model: string;
    backend: "vertex-imagen" | "vertex-gemini";
};

const DEFAULT_VERTEX_GEMINI_MODEL = "gemini-2.5-flash-image";
const DEFAULT_VERTEX_IMAGEN_MODEL = "imagen-3.0-generate-002";

/** Modelos Gemini imagen que suelen requerir endpoint global en Vertex (no europe-west1). */
const VERTEX_GLOBAL_IMAGE_MODELS = new Set([
    "gemini-3.1-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image",
    "gemini-3-pro-image-preview",
]);

function modelPrefersGlobalEndpoint(model: string): boolean {
    if (VERTEX_GLOBAL_IMAGE_MODELS.has(model)) return true;
    return model.startsWith("gemini-3.1-flash-image") || model.startsWith("gemini-3-pro-image");
}

function resolveVertexImageLocation(model: string, configuredLocation: string): string {
    const location = configuredLocation.trim() || "europe-west1";
    if (location === "global") return "global";
    if (modelPrefersGlobalEndpoint(model)) {
        const forceGlobal = process.env.VERTEX_IMAGE_USE_GLOBAL_LOCATION?.trim().toLowerCase();
        if (forceGlobal === "1" || forceGlobal === "true" || forceGlobal === "yes") {
            return "global";
        }
    }
    return location;
}

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

    const configuredLocation =
        process.env.GOOGLE_CLOUD_LOCATION?.trim() ||
        process.env.VERTEX_LOCATION?.trim() ||
        "europe-west1";

    const backend = getVertexImageBackend();
    const model =
        backend === "gemini" ? resolveVertexGeminiModel() : resolveVertexImagenModel();
    const location =
        backend === "gemini"
            ? resolveVertexImageLocation(model, configuredLocation)
            : configuredLocation;

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

    const credentials = loadGcpServiceAccountCredentials();
    return new GoogleGenAI({
        vertexai: true,
        project,
        location,
        ...(credentials
            ? { googleAuthOptions: { credentials } }
            : {}),
    });
}

function isVertexModelNotFoundError(raw: string): boolean {
    return /NOT_FOUND|404|not found/i.test(raw) && /Publisher Model/i.test(raw);
}

function wrapVertexError(
    error: unknown,
    context?: { model?: string; location?: string },
): Error {
    const raw = error instanceof Error ? error.message : String(error);
    if (isVertexModelNotFoundError(raw) && context?.model) {
        const hints = [
            `Quita VERTEX_GEMINI_IMAGE_MODEL o usa ${DEFAULT_VERTEX_GEMINI_MODEL} (funciona en europe-west1).`,
            "Para gemini-3.x imagen en Vertex: VERTEX_IMAGE_USE_GLOBAL_LOCATION=true y GOOGLE_CLOUD_LOCATION=global.",
            "Prueba gemini-3.1-flash-image-preview si tu proyecto tiene acceso preview.",
        ];
        return new Error(
            `Modelo Vertex no disponible: ${context.model} en ${context.location ?? "?"}. ` +
                hints.join(" ") +
                ` Detalle: ${raw}`,
        );
    }
    if (/Could not load the default credentials/i.test(raw)) {
        const vercelHint = hasGcpServiceAccountEnv()
            ? " Revisa que GCP_SERVICE_ACCOUNT_JSON sea valido."
            : " En local: `gcloud auth application-default login`. En Vercel: variable GCP_SERVICE_ACCOUNT_JSON con el JSON de la service account (rol Vertex AI User).";
        return new Error(`Sin credenciales GCP.${vercelHint}`);
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
        throw wrapVertexError(error, { model });
    }
}

async function generateWithVertexGeminiImage(
    config: VertexImageConfig,
    prompt: string,
    inputs?: GenerationImageInputs,
    options?: { promptVersion?: string },
): Promise<VertexGeneratedImage> {
    const parts = buildGeminiImageGenerationParts(prompt, inputs, options?.promptVersion);
    const genConfig = buildGeminiImageGenerateContentConfig(options);

    async function runWithLocation(location: string): Promise<VertexGeneratedImage> {
        const ai = createVertexGenAIClient({ project: config.project, location });
        const response = await ai.models.generateContent({
            model: config.model,
            contents: [{ role: "user", parts }],
            config: genConfig,
        });

        const responseParts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of responseParts) {
            const inline = part.inlineData;
            if (inline?.data) {
                return {
                    buffer: Buffer.from(inline.data, "base64"),
                    contentType: inline.mimeType || "image/png",
                    model: config.model,
                    backend: "vertex-gemini",
                };
            }
        }

        throw new Error("Vertex Gemini no devolvio imagen en la respuesta.");
    }

    try {
        return await runWithLocation(config.location);
    } catch (error) {
        const raw = error instanceof Error ? error.message : String(error);
        const canRetryGlobal =
            config.location !== "global" &&
            modelPrefersGlobalEndpoint(config.model) &&
            isVertexModelNotFoundError(raw);

        if (canRetryGlobal) {
            try {
                return await runWithLocation("global");
            } catch (retryError) {
                throw wrapVertexError(retryError, {
                    model: config.model,
                    location: "global",
                });
            }
        }

        throw wrapVertexError(error, { model: config.model, location: config.location });
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

    if (config.backend === "gemini") {
        return generateWithVertexGeminiImage(config, prompt, inputs, options);
    }

    if ((inputs?.references?.length ?? 0) > 0) {
        throw new Error(
            "Vertex Imagen (texto solo) ignora las imagenes de referencia. " +
                "Usa VERTEX_IMAGE_BACKEND=gemini en .env.local.",
        );
    }

    const ai = client ?? createVertexGenAIClient(config);
    return generateWithVertexImagen(ai, prompt, config.model);
}
