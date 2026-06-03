/** Constantes de version de prompt — seguro para componentes cliente (sin Node/fs). */

export const PROMPT_VERSION_V5 = "v5-color-geometry-split";
export const PROMPT_VERSION_V6 = "v6-local-shape-n3d-color";

const DEFAULT_PROMPT_VERSION = PROMPT_VERSION_V6;

export const PROMPT_VERSION_OPTIONS = [
    { value: PROMPT_VERSION_V5, label: "v5", hint: "Color y forma equilibrados" },
    { value: PROMPT_VERSION_V6, label: "v6", hint: "Forma local · color N3D" },
] as const;

export function getDefaultPromptVersion(): string {
    return DEFAULT_PROMPT_VERSION;
}

export function resolvePromptVersion(version?: string | null): string {
    const trimmed = version?.trim();
    if (trimmed && PROMPT_VERSION_OPTIONS.some((option) => option.value === trimmed)) {
        return trimmed;
    }
    return DEFAULT_PROMPT_VERSION;
}

export function isV6PromptVersion(version: string): boolean {
    return version === PROMPT_VERSION_V6 || version.startsWith("v6-");
}
