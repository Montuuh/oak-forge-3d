export type ImageGenerationProvider = "aistudio" | "vertex";

export function getImageGenerationProvider(): ImageGenerationProvider {
    const value = process.env.IMAGE_PROVIDER?.trim().toLowerCase();
    if (value === "vertex") return "vertex";
    return "aistudio";
}

/** Solo lectura de env — seguro para importar desde componentes cliente si se pasa por props desde el servidor. */
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
