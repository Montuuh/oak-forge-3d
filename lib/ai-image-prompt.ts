import type { GenerationImageInputs } from "@/lib/ai-image-inputs";
import {
    hasGeometryReference,
    hasN3dColorReference,
} from "@/lib/ai-image-inputs";
import {
    getDefaultPromptVersion,
    isV6PromptVersion,
} from "@/lib/ai-image-prompt-versions";

export {
    getDefaultPromptVersion,
    isV6PromptVersion,
    PROMPT_VERSION_OPTIONS,
    PROMPT_VERSION_V5,
    PROMPT_VERSION_V6,
    resolvePromptVersion,
} from "@/lib/ai-image-prompt-versions";

const CAMERA_YAW_MIN = -15;
const CAMERA_YAW_MAX = 15;

const TYPE_COLOR_HINTS: Record<string, string[]> = {
    grass: ["green", "leaf green"],
    poison: ["purple", "violet"],
    fire: ["red", "orange", "flame orange"],
    water: ["blue", "aqua"],
    electric: ["yellow", "gold"],
    psychic: ["pink", "magenta"],
    fighting: ["brown", "red"],
    normal: ["beige", "cream"],
    flying: ["sky blue", "white"],
    ground: ["tan", "earth brown"],
    rock: ["gray", "stone brown"],
    bug: ["lime green", "forest green"],
    ghost: ["purple", "indigo"],
    steel: ["silver", "steel gray"],
    ice: ["icy blue", "white"],
    dragon: ["indigo", "purple"],
    dark: ["black", "dark gray"],
    fairy: ["pink", "lavender"],
};

const NEGATIVE_PROMPT =
    "desk props, game consoles, game cases, tools, plants, filament spools, keychains, glasses, " +
    "cluttered background, busy scene, floating object, object on cliff edge, " +
    "flat catalog render, CGI illustration, hands, watermark, N3D logo, " +
    "wrong colors vs color reference, wrong shape vs geometry reference, " +
    "neon oversaturation, vertical layer lines, thick layer lines, deep grooves, toy gloss plastic";

const NEGATIVE_PROMPT_V6 =
    NEGATIVE_PROMPT +
    ", copying silhouette from N3D color reference, N3D render proportions overriding local photo, " +
    "local photo palette overriding N3D hues, shape drift from geometry reference, " +
    "generic N3D catalog pose instead of local photo form";

const N3D_SUBJECT_NEGATIVE =
    "full standing pokemon figure, bipedal figurine, plush toy, action figure, " +
    "different silhouette than reference, non-spherical shape, generic bulbasaur fan art";

const CAMERA_NEGATIVE =
    "profile view, extreme three-quarter angle, 45 degree rotation, 90 degree side view, " +
    "top-down, bird's eye, Dutch angle, worm's eye";

export function pickLifestyleCameraYawDegrees(): number {
    return Math.floor(Math.random() * (CAMERA_YAW_MAX - CAMERA_YAW_MIN + 1)) + CAMERA_YAW_MIN;
}

function formatCameraAngleLines(yawDegrees: number): string[] {
    const lens = "50mm lens, f/2.8 aperture, eye-level, gentle background softness (wall only, not busy).";

    if (yawDegrees === 0) {
        return [
            `Camera: straight-on front view (0° horizontal yaw), ${lens}`,
            "Composition: nearly frontal hero shot; subtle yaw only within ±15° from straight-on.",
        ];
    }

    const direction = yawDegrees > 0 ? "right" : "left";
    const abs = Math.abs(yawDegrees);

    return [
        `Camera: nearly front-facing with ${abs}° horizontal yaw to the ${direction} ` +
            `(within ±15° from straight-on; no profile, no extreme 3/4). ${lens}`,
        "Composition: keep the collectible readable from the front; only a slight turn for natural product photography.",
    ];
}

function formatPokemonName(product: {
    name: string;
    pokemonName?: string | null;
}): string {
    if (product.pokemonName?.trim()) {
        const raw = product.pokemonName.trim();
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    const match = product.name.match(/-\s*([^-]+?)\s*$/);
    if (match?.[1]) {
        return match[1].trim();
    }
    return product.name;
}

function inferColorPalette(pokemonTypes: string[] | undefined): {
    colors: string;
    blockColor: string;
} {
    const hints = new Set<string>();
    for (const type of pokemonTypes ?? []) {
        for (const color of TYPE_COLOR_HINTS[type.toLowerCase()] ?? []) {
            hints.add(color);
        }
    }
    const colors =
        hints.size > 0
            ? Array.from(hints).join(", ")
            : "exact hues from the primary reference image";
    const blockColor =
        "monochrome gray or palette that contradicts the color reference";
    return { colors, blockColor };
}

function buildSubjectLine(
    product: LifestylePromptProduct,
    inputs: GenerationImageInputs,
    v6: boolean,
): string[] {
    const pokemonName = formatPokemonName(product);
    const n3dColor = hasN3dColorReference(product.slug, inputs);
    const geometry = hasGeometryReference(inputs);

    if (n3dColor && geometry) {
        if (v6) {
            return [
                "A professional, simple, hyper-realistic product photograph of",
                "the same decorative Pokéball-inspired 3D-printed PLA collectible:",
                `AUTHORITATIVE SHAPE — local GEOMETRY reference (weight 1.0): match its silhouette, proportions, feature placement, and 3D form exactly (${pokemonName} Pokéball hybrid).`,
                "AUTHORITATIVE COLOR — N3D COLOR reference (weight 1.0): match its hues, saturation, and PLA material color exactly.",
                "N3D silhouette weight = 0 when local geometry exists — extract color only from N3D; ignore N3D shape, pose, and proportions.",
                "Local photo color weight ≤ 0.15 — ambient print tone at most; never override the N3D palette.",
                "Do NOT reinterpret as a full standing Pokémon figure.",
                "Re-stage only: clean oak desk, plain gotelé wall; remove watermark, plants, and original props.",
            ];
        }
        return [
            "A professional, simple, hyper-realistic product photograph of",
            "the same decorative Pokéball-inspired 3D-printed PLA collectible:",
            `GEOMETRY reference(s) define silhouette, proportions, and 3D form (${pokemonName} Pokéball hybrid).`,
            "COLOR reference (N3D render) defines hues, saturation, and material color — do not copy its background, props, or watermark.",
            "Do NOT reinterpret as a full standing Pokémon figure.",
            "Re-stage only: clean oak desk, plain gotelé wall; remove watermark, plants, and original props.",
        ];
    }

    if (n3dColor) {
        return [
            "A professional, simple, hyper-realistic product photograph of",
            "the EXACT SAME decorative Pokéball-inspired 3D-printed PLA collectible shown in the COLOR reference (N3D):",
            `spherical Pokéball hybrid form with ${pokemonName} styling (bulb, ears, spots, colors).`,
            "Copy shape and colors from the N3D reference faithfully — do NOT reinterpret as a full standing Pokémon figure.",
            "Re-stage only: clean oak desk, plain gotelé wall; remove watermark, plants, and original props.",
        ];
    }

    if (geometry) {
        return [
            "A professional, simple, hyper-realistic product photograph of",
            "a 3D printed PLA collectible matching the GEOMETRY reference(s) for silhouette and proportions:",
            `${pokemonName} styling.`,
            "Use colors visible in the geometry photo or faithful PLA hues; keep matte print realism.",
        ];
    }

    const { colors } = inferColorPalette(product.pokemonTypes);
    return [
        "A professional, simple, hyper-realistic product photograph of a",
        colors,
        "3D printed FDM collectible featuring",
        pokemonName + ".",
        "Faithfully match the attached references.",
    ];
}

function buildFinishLine(slug: string, inputs: GenerationImageInputs): string {
    if (hasN3dColorReference(slug, inputs) || hasGeometryReference(inputs)) {
        return "Matte PLA, VERY SUBTLE fine 0.12mm HORIZONTAL layer lines on the spherical collectible.";
    }
    return "Matte PLA, upright orientation, VERY SUBTLE fine 0.12mm HORIZONTAL layer lines.";
}

function describeReferences(inputs: GenerationImageInputs, v6: boolean): string[] {
    return inputs.references.map((ref, index) => {
        const n = index + 1;
        switch (ref.role) {
            case "color":
                if (v6) {
                    return (
                        `Reference ${n} (${ref.label}): COLOR (N3D) — palette weight 1.0, shape weight 0.0. ` +
                        "Match hues, saturation, and material color exactly. " +
                        "Ignore N3D silhouette, proportions, and pose when a local geometry reference exists."
                    );
                }
                return (
                    `Reference ${n} (${ref.label}): COLOR — weight 1.0. ` +
                    "Match hues, saturation, and material color exactly. " +
                    "Do not use for silhouette when a geometry reference is present."
                );
            case "geometry":
                if (v6) {
                    return (
                        `Reference ${n} (${ref.label}): GEOMETRY (local) — shape weight 1.0, color weight ≤ 0.15. ` +
                        "Match silhouette, proportions, pose, and 3D form exactly — this is the authoritative shape source. " +
                        "Do not copy its colors when an N3D color reference is present."
                    );
                }
                return (
                    `Reference ${n} (${ref.label}): GEOMETRY — weight 1.0. ` +
                    "Match silhouette, proportions, pose, and 3D form exactly. " +
                    "Do not copy its colors when a color reference is present."
                );
            case "color_geometry":
                return (
                    `Reference ${n} (${ref.label}): COLOR + GEOMETRY — ` +
                    "match shape and colors when no split references exist."
                );
        }
    });
}

function buildReferenceWeightsBlock(
    slug: string,
    inputs: GenerationImageInputs,
    v6: boolean,
): string[] {
    if (!v6) return [];
    if (!hasN3dColorReference(slug, inputs) || !hasGeometryReference(inputs)) return [];

    return [
        "[REFERENCE WEIGHTS — STRICT SPLIT]",
        "Local GEOMETRY → silhouette, proportions, 3D form: weight 1.0 (authoritative).",
        "N3D COLOR → hues, saturation, PLA material color: weight 1.0 (authoritative).",
        "N3D shape / proportions: weight 0.0 — discard when local geometry is present.",
        "Local photo colors: weight ≤ 0.15 — subtle print tone only; N3D palette always wins.",
        "",
    ];
}

export type LifestylePromptProduct = {
    name: string;
    category: string;
    slug: string;
    pokemonName?: string | null;
    pokemonTypes?: string[];
    pokedexNumber?: number | null;
};

export type LifestylePromptOptions = {
    /** Horizontal yaw in degrees from straight-on front. Default: random in [-15, 15]. */
    cameraYawDegrees?: number;
    /** Defaults to getDefaultPromptVersion(). */
    promptVersion?: string;
};

export function buildLifestyleImagePrompt(
    product: LifestylePromptProduct,
    inputs: GenerationImageInputs,
    options?: LifestylePromptOptions,
): string {
    const version = options?.promptVersion ?? getDefaultPromptVersion();
    const v6 = isV6PromptVersion(version);
    const { blockColor } = inferColorPalette(product.pokemonTypes);
    const refLines = describeReferences(inputs, v6);
    const n3dColor = hasN3dColorReference(product.slug, inputs);
    const subjectLines = buildSubjectLine(product, inputs, v6);
    const negativeExtra = n3dColor ? N3D_SUBJECT_NEGATIVE + ", " : "";
    const cameraYaw = options?.cameraYawDegrees ?? pickLifestyleCameraYawDegrees();
    const cameraLines = formatCameraAngleLines(cameraYaw);
    const negativePrompt = v6 ? NEGATIVE_PROMPT_V6 : NEGATIVE_PROMPT;

    return [
        "Role: Expert in clean, premium e-commerce product photography and technical color grading.",
        "",
        `You receive ${inputs.references.length} reference image(s). Follow each role strictly.`,
        ...refLines,
        ...buildReferenceWeightsBlock(product.slug, inputs, v6),
        "[SCENE — MINIMAL]",
        "Environment: continuous oak wood desk in the foreground, soft neutral gotelé wall in the back.",
        "NO props, NO accessories, NO extra objects on the desk — only the collectible and honest wood surface.",
        ...cameraLines,
        "",
        "[POSITIVE PROMPT]",
        ...subjectLines,
        n3dColor ? "" : `NOT ${blockColor}.`,
        buildFinishLine(product.slug, inputs),
        "Centered or rule-of-thirds composition; the collectible is the sole hero subject.",
        "Continuous oak desk visible between camera and object; soft natural daylight from the left.",
        "Neutral color temperature; soft contact shadow on the desk.",
        "",
        "[NEGATIVE PROMPT]",
        negativeExtra + blockColor + ",",
        CAMERA_NEGATIVE + ",",
        negativePrompt,
        "",
        `Product: ${product.name} (${product.category}).`,
        `Prompt version: ${version}`,
        `Camera yaw: ${cameraYaw}°`,
    ]
        .filter((line) => line !== "")
        .join("\n");
}
