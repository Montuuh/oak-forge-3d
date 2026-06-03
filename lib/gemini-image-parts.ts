import type { GenerationImageInputs } from "@/lib/ai-image-inputs";
import { getDefaultPromptVersion, isV6PromptVersion } from "@/lib/ai-image-prompt-versions";
import { hasColorReference, hasGeometryReference } from "@/lib/ai-image-inputs";

export type GeminiContentPart =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

function inlinePart(file: { buffer: Buffer; mimeType: string }): GeminiContentPart {
    return {
        inlineData: {
            mimeType: file.mimeType,
            data: file.buffer.toString("base64"),
        },
    };
}

function roleHintForReference(
    ref: GenerationImageInputs["references"][number],
    v6: boolean,
): string {
    switch (ref.role) {
        case "color":
            if (v6) {
                return "COLOR reference (N3D) — palette weight 1.0; shape weight 0.0 when local geometry exists";
            }
            return "COLOR reference — mandatory palette, hues, and material color";
        case "geometry":
            if (v6) {
                return "GEOMETRY reference (local photo) — shape weight 1.0 authoritative; color weight ≤ 0.15";
            }
            return "GEOMETRY reference — mandatory silhouette, proportions, and 3D form";
        case "color_geometry":
            return "COLOR + GEOMETRY reference — match shape and colors";
    }
}

function buildReferenceIntro(refs: GenerationImageInputs["references"], v6: boolean): string {
    const hasColor = hasColorReference({ references: refs });
    const hasGeometry = hasGeometryReference({ references: refs });

    if (hasColor && hasGeometry) {
        if (v6) {
            return (
                `You receive ${refs.length} reference image(s). ` +
                "Strict priority: LOCAL GEOMETRY photo = ground truth for silhouette, proportions, feature placement, and 3D form (weight 1.0). " +
                "N3D COLOR render = ground truth for hues, saturation, and PLA material color (weight 1.0). " +
                "N3D shape weight = 0 — extract color only from N3D; never let N3D proportions override the local photo. " +
                "Do NOT replace the object with a generic standing Pokémon figure. " +
                "Only re-light and re-photograph in the scene described below."
            );
        }
        return (
            `You receive ${refs.length} reference image(s). ` +
            "Build the output as follows: " +
            "SHAPE and proportions from the GEOMETRY reference(s); " +
            "COLORS and material hues from the COLOR reference (N3D). " +
            "Do NOT replace the object with a generic standing Pokémon figure. " +
            "Only re-light and re-photograph in the scene described below."
        );
    }

    if (hasColor) {
        return (
            `You receive ${refs.length} reference image(s). ` +
            "The COLOR reference (N3D) defines palette and also guides Pokéball hybrid shape when no separate geometry photo exists. " +
            "Do NOT replace it with a generic standing Pokémon figure. " +
            "Only re-light and re-photograph in the scene described below."
        );
    }

    return (
        `You receive ${refs.length} reference image(s). ` +
        "The GEOMETRY reference(s) define silhouette, proportions, and form. " +
        "Only re-light and re-photograph in the scene described below."
    );
}

/** Referencias primero (forma → color), instrucciones despues. */
export function buildGeminiImageGenerationParts(
    prompt: string,
    inputs?: GenerationImageInputs,
    promptVersion?: string,
): GeminiContentPart[] {
    const parts: GeminiContentPart[] = [];
    const refs = inputs?.references ?? [];
    const version = promptVersion ?? getDefaultPromptVersion();
    const v6 = isV6PromptVersion(version);

    if (refs.length === 0) {
        parts.push({ text: prompt });
        return parts;
    }

    parts.push({ text: buildReferenceIntro(refs, v6) });

    for (const ref of refs) {
        parts.push({ text: `[${roleHintForReference(ref, v6)}: ${ref.label}]` });
        parts.push(inlinePart(ref));
    }

    parts.push({ text: "--- SCENE AND STYLE INSTRUCTIONS ---" });
    parts.push({ text: prompt });
    return parts;
}

export function summarizeReferenceInputs(inputs?: GenerationImageInputs): string {
    const refs = inputs?.references ?? [];
    if (refs.length === 0) return "sin referencias";

    const geometry = refs
        .filter((ref) => ref.role === "geometry" || ref.role === "color_geometry")
        .map((ref) => ref.label);
    const color = refs
        .filter((ref) => ref.role === "color" || ref.role === "color_geometry")
        .map((ref) => ref.label);

    const parts: string[] = [];
    if (geometry.length > 0) parts.push(`forma: ${geometry.join(", ")}`);
    if (color.length > 0) parts.push(`color: ${color.join(", ")}`);
    return parts.join(" · ");
}
