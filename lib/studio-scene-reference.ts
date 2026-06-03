import fs from "fs/promises";
import path from "path";
import type { GenerationImageInputs, ReferenceImageInput } from "@/lib/ai-image-inputs";
import { extensionForMime, publicPathExists } from "@/lib/local-product-image-storage";
import { isV7PromptVersion } from "@/lib/ai-image-prompt-versions";

const STUDIO_PUBLIC_DIR = path.join(process.cwd(), "public", "images", "studio");

export const DEFAULT_STUDIO_SCENE_BASENAME = "default";
export const CUSTOM_STUDIO_SCENE_BASENAME = "custom";

const CANDIDATE_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"] as const;

import type { StudioSceneStatus } from "@/lib/studio-scene-types";

export type { StudioSceneSource, StudioSceneStatus } from "@/lib/studio-scene-types";

function guessMime(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".gif") return "image/gif";
    return "image/webp";
}

async function findExistingBasename(basename: string): Promise<string | null> {
    for (const ext of CANDIDATE_EXTENSIONS) {
        const filename = `${basename}${ext}`;
        const webPath = `/images/studio/${filename}`;
        if (publicPathExists(webPath)) return webPath;
    }
    return null;
}

export function resolveStudioSceneWebPath(): string | null {
    const envPath = process.env.STUDIO_SCENE_IMAGE_PATH?.trim();
    if (envPath && publicPathExists(envPath)) {
        return envPath;
    }

    const custom = findExistingBasenameSync(CUSTOM_STUDIO_SCENE_BASENAME);
    if (custom) return custom;

    return findExistingBasenameSync(DEFAULT_STUDIO_SCENE_BASENAME);
}

function findExistingBasenameSync(basename: string): string | null {
    for (const ext of CANDIDATE_EXTENSIONS) {
        const webPath = `/images/studio/${basename}${ext}`;
        if (publicPathExists(webPath)) return webPath;
    }
    return null;
}

export function getStudioSceneStatus(): StudioSceneStatus {
    const envPath = process.env.STUDIO_SCENE_IMAGE_PATH?.trim();
    if (envPath && publicPathExists(envPath)) {
        return { webPath: envPath, source: "env", label: "Variable de entorno" };
    }

    const custom = findExistingBasenameSync(CUSTOM_STUDIO_SCENE_BASENAME);
    if (custom) {
        return { webPath: custom, source: "custom", label: "Personalizada (admin)" };
    }

    const fallback = findExistingBasenameSync(DEFAULT_STUDIO_SCENE_BASENAME);
    if (fallback) {
        return { webPath: fallback, source: "default", label: "Por defecto (mesa + gotelé)" };
    }

    return {
        webPath: null,
        source: "missing",
        label: "Falta imagen en public/images/studio/default.*",
    };
}

async function readPublicImage(webPath: string): Promise<ReferenceImageInput | null> {
    if (!publicPathExists(webPath)) return null;
    const diskPath = path.join(process.cwd(), "public", webPath.replace(/^\//, ""));
    const buffer = await fs.readFile(diskPath);
    return {
        buffer,
        mimeType: guessMime(diskPath),
        webPath,
        imageId: "studio-scene",
        role: "scene",
        label: "Escena de estudio (mesa + pared)",
    };
}

export async function loadStudioSceneReferenceInput(): Promise<ReferenceImageInput | null> {
    const status = getStudioSceneStatus();
    if (!status.webPath) return null;
    return readPublicImage(status.webPath);
}

export async function mergeStudioSceneIntoInputs(
    inputs: GenerationImageInputs,
    promptVersion: string,
): Promise<GenerationImageInputs> {
    if (!isV7PromptVersion(promptVersion)) {
        return inputs;
    }

    const sceneRef = await loadStudioSceneReferenceInput();
    if (!sceneRef) {
        throw new Error(
            "Prompt v7 requiere una imagen de escena. Sube default.jpg en public/images/studio/ " +
                "o usa «Subir escena» en el panel de generacion AI.",
        );
    }

    const productRefs = inputs.references.filter((ref) => ref.role !== "scene");
    return {
        references: [sceneRef, ...productRefs],
    };
}

export async function saveCustomStudioSceneFile(
    body: Buffer,
    mimeType: string,
): Promise<string> {
    const ext = extensionForMime(mimeType);
    const filename = `${CUSTOM_STUDIO_SCENE_BASENAME}${ext}`;
    const webPath = `/images/studio/${filename}`;

    await fs.mkdir(STUDIO_PUBLIC_DIR, { recursive: true });

    for (const candidate of CANDIDATE_EXTENSIONS) {
        const other = path.join(STUDIO_PUBLIC_DIR, `${CUSTOM_STUDIO_SCENE_BASENAME}${candidate}`);
        try {
            await fs.unlink(other);
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== "ENOENT") throw error;
        }
    }

    await fs.writeFile(path.join(STUDIO_PUBLIC_DIR, filename), body);
    return webPath;
}

export async function clearCustomStudioSceneFile(): Promise<void> {
    for (const ext of CANDIDATE_EXTENSIONS) {
        const diskPath = path.join(STUDIO_PUBLIC_DIR, `${CUSTOM_STUDIO_SCENE_BASENAME}${ext}`);
        try {
            await fs.unlink(diskPath);
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== "ENOENT") throw error;
        }
    }
}
