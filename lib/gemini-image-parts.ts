import type { GenerationImageInputs } from "@/lib/ai-image-inputs";
import { V7_CENTER_FINAL_CHECK } from "@/lib/ai-image-prompt";
import {
    getDefaultPromptVersion,
    isV6PromptVersion,
    isV7PromptVersion,
} from "@/lib/ai-image-prompt-versions";
import {
    hasColorReference,
    hasGeometryReference,
    hasSceneReference,
} from "@/lib/ai-image-inputs";

export type GeminiContentPart =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

const V7_CENTER_PRIORITY_TEXT =
    "[CENTER — TOP PRIORITY]\n" +
    "The output Pokéball must sit on the vertical centerline of the image (50% width, equal margin left and right).\n" +
    "This overrides scene perspective, product-reference cropping, and rule-of-thirds habits.";

const V7_SCENE_ANCHOR_TEXT =
    "[SCENE — MATERIALS + LIGHT ONLY]\n" +
    "This image has NO product. Use it ONLY for: oak desk wood, gotelé wall, and lighting direction.\n" +
    "Key light from the LEFT (viewer's left); shadows on the desk toward the RIGHT.\n" +
    "Do NOT copy this photo's camera angle, desk diagonal, or empty-space layout.\n" +
    "Output uses straight-on centered camera; Pokéball placed at horizontal center of frame.";

const V7_SCENE_REPEAT_TEXT =
    "[SCENE REMINDER — LIGHT + MATERIALS]\n" +
    "Match oak desk, gotelé wall, and LEFT key light from this SCENE image. " +
    "Do NOT copy scene camera angle. Pokéball stays on vertical centerline of output.";

function inlinePart(file: { buffer: Buffer; mimeType: string }): GeminiContentPart {
    return {
        inlineData: {
            mimeType: file.mimeType,
            data: file.buffer.toString("base64"),
        },
    };
}

function v7ProductPreamble(
    ref: GenerationImageInputs["references"][number],
): string {
    switch (ref.role) {
        case "color":
            return (
                "PRODUCT reference (next image) — PLA palette and saturation ONLY. " +
                "IGNORE its background, desk, wall, shadows, and light direction."
            );
        case "geometry":
            return (
                "PRODUCT reference (next image) — silhouette, proportions, and 3D form ONLY. " +
                "IGNORE its background, desk, wall, shadows, and light direction."
            );
        case "color_geometry":
            return (
                "PRODUCT reference (next image) — shape and colors ONLY. " +
                "IGNORE its background and lighting."
            );
        default:
            return "PRODUCT reference (next image) — subject only; ignore environment.";
    }
}

function roleHintForReference(
    ref: GenerationImageInputs["references"][number],
    v6: boolean,
    v7: boolean,
): string {
    switch (ref.role) {
        case "scene":
            if (v7) {
                return "SCENE — mandatory environment + LEFT key light; never copy products from this image";
            }
            return "SCENE reference — replicate desk, gotelé wall, and lighting only; never copy products from this image";
        case "color":
            if (v6) {
                return "COLOR reference (N3D) — palette weight 1.0; shape weight 0.0 when local geometry exists; NO lighting";
            }
            return "COLOR reference — mandatory palette, hues, and material color; NO lighting from this image";
        case "geometry":
            if (v6) {
                return "GEOMETRY reference (local photo) — shape weight 1.0 authoritative; color weight ≤ 0.15; NO lighting";
            }
            return "GEOMETRY reference — mandatory silhouette, proportions, and 3D form; NO lighting from this image";
        case "color_geometry":
            return "COLOR + GEOMETRY reference — match shape and colors; NO lighting from this image";
    }
}

function buildV7ReferenceIntro(
    sceneCount: number,
    productCount: number,
): string {
    return (
        `Locked studio: ${productCount} PRODUCT image(s) = shape/color only. ` +
        `${sceneCount} SCENE image(s) = oak desk, gotelé wall, LEFT key light only (no camera angle). ` +
        "Output: straight-on camera, Pokéball on vertical centerline of frame. " +
        "Do NOT replace the object with a generic standing Pokémon figure."
    );
}

function buildReferenceIntro(
    refs: GenerationImageInputs["references"],
    v6: boolean,
    v7: boolean,
): string {
    const hasColor = hasColorReference({ references: refs });
    const hasGeometry = hasGeometryReference({ references: refs });
    const sceneLead =
        v7 && hasSceneReference({ references: refs })
            ? "SCENE reference controls environment and LEFT-side lighting. "
            : "";

    if (hasColor && hasGeometry) {
        if (v6) {
            return (
                sceneLead +
                `You receive ${refs.length} reference image(s). ` +
                "Strict priority: LOCAL GEOMETRY photo = ground truth for silhouette, proportions, feature placement, and 3D form (weight 1.0). " +
                "N3D COLOR render = ground truth for hues, saturation, and PLA material color (weight 1.0). " +
                "N3D shape weight = 0 — extract color only from N3D; never let N3D proportions override the local photo. " +
                "Do NOT replace the object with a generic standing Pokémon figure. " +
                (v7
                    ? "Environment and lighting come ONLY from the SCENE reference."
                    : "Only re-light and re-photograph in the scene described below.")
            );
        }
        return (
            sceneLead +
            `You receive ${refs.length} reference image(s). ` +
            "Build the output as follows: " +
            "SHAPE and proportions from the GEOMETRY reference(s); " +
            "COLORS and material hues from the COLOR reference (N3D). " +
            "Do NOT replace the object with a generic standing Pokémon figure. " +
            (v7
                ? "Environment and lighting come ONLY from the SCENE reference."
                : "Only re-light and re-photograph in the scene described below.")
        );
    }

    if (hasColor) {
        return (
            sceneLead +
            `You receive ${refs.length} reference image(s). ` +
            "The COLOR reference (N3D) defines palette and also guides Pokéball hybrid shape when no separate geometry photo exists. " +
            "Do NOT replace it with a generic standing Pokémon figure. " +
            (v7
                ? "Environment and lighting come ONLY from the SCENE reference."
                : "Only re-light and re-photograph in the scene described below.")
        );
    }

    return (
        sceneLead +
        `You receive ${refs.length} reference image(s). ` +
        "The GEOMETRY reference(s) define silhouette, proportions, and form. " +
        (v7
            ? "Environment and lighting come ONLY from the SCENE reference."
            : "Only re-light and re-photograph in the scene described below.")
    );
}

function buildV7GeminiParts(
    prompt: string,
    refs: GenerationImageInputs["references"],
    v6: boolean,
): GeminiContentPart[] {
    const sceneRefs = refs.filter((ref) => ref.role === "scene");
    const productRefs = refs.filter((ref) => ref.role !== "scene");
    const parts: GeminiContentPart[] = [];

    parts.push({ text: V7_CENTER_PRIORITY_TEXT });
    parts.push({
        text: buildV7ReferenceIntro(sceneRefs.length, productRefs.length),
    });

    for (const ref of productRefs) {
        parts.push({
            text:
                "PRODUCT — shape/color only; IGNORE its position in frame — re-center subject in output.",
        });
        parts.push({ text: v7ProductPreamble(ref) });
        parts.push({ text: `[${roleHintForReference(ref, v6, true)}: ${ref.label}]` });
        parts.push(inlinePart(ref));
    }

    for (const ref of sceneRefs) {
        parts.push({ text: V7_SCENE_ANCHOR_TEXT });
        parts.push({ text: `[${roleHintForReference(ref, v6, true)}: ${ref.label}]` });
        parts.push(inlinePart(ref));
    }

    for (const ref of sceneRefs) {
        parts.push({ text: V7_SCENE_REPEAT_TEXT });
        parts.push(inlinePart(ref));
    }

    parts.push({ text: V7_CENTER_FINAL_CHECK });
    parts.push({ text: "--- SCENE AND STYLE INSTRUCTIONS ---" });
    parts.push({ text: prompt });
    parts.push({ text: V7_CENTER_FINAL_CHECK });
    return parts;
}

/** Referencias primero (escena → forma → color), instrucciones despues. */
export function buildGeminiImageGenerationParts(
    prompt: string,
    inputs?: GenerationImageInputs,
    promptVersion?: string,
): GeminiContentPart[] {
    const parts: GeminiContentPart[] = [];
    const refs = inputs?.references ?? [];
    const version = promptVersion ?? getDefaultPromptVersion();
    const v6 = isV6PromptVersion(version);
    const v7 = isV7PromptVersion(version);

    if (refs.length === 0) {
        parts.push({ text: prompt });
        return parts;
    }

    if (v7 && hasSceneReference({ references: refs })) {
        return buildV7GeminiParts(prompt, refs, v6);
    }

    parts.push({ text: buildReferenceIntro(refs, v6, v7) });

    for (const ref of refs) {
        parts.push({ text: `[${roleHintForReference(ref, v6, v7)}: ${ref.label}]` });
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
    const scene = refs.filter((ref) => ref.role === "scene").map((ref) => ref.label);

    const parts: string[] = [];
    if (scene.length > 0) parts.push(`escena: ${scene.join(", ")}`);
    if (geometry.length > 0) parts.push(`forma: ${geometry.join(", ")}`);
    if (color.length > 0) parts.push(`color: ${color.join(", ")}`);
    return parts.join(" · ");
}
