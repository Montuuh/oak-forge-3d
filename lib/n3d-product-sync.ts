import type { Product } from "@prisma/client";
import { fetchN3dDesign, type N3dDesignDetail } from "@/lib/n3d-api";
import {
    applyFullN3dDataToProduct,
    downloadAndStoreN3dRender,
    mapN3dDesignToFieldValues,
} from "@/lib/n3d-catalog-sync";
import { recordProductN3dSync } from "@/lib/n3d-sync-timestamp";
import { db } from "@/lib/db";
import { resolveN3dRenderUrl } from "@/lib/product-image-storage";
import {
    type FilamentLine,
    filamentsChanged,
    formatFilamentLines,
    loadProductFilamentLines,
    mapN3dFilamentsToLines,
} from "@/lib/product-filaments";

export type N3dSyncFieldKey =
    | "name"
    | "category"
    | "n3dSlug"
    | "printTime"
    | "printTimeSeconds"
    | "weightGrams"
    | "pokemonName"
    | "pokedexNumber"
    | "pokemonTypes"
    | "longDescription"
    | "filaments"
    | "n3dImage";

export type N3dSyncChoice = "old" | "new";

export type N3dSyncFieldValues = {
    name: string;
    category: string;
    n3dSlug: string;
    printTime: string | null;
    printTimeSeconds: number | null;
    weightGrams: number | null;
    pokemonName: string | null;
    pokedexNumber: number | null;
    pokemonTypes: string[];
    longDescription: string | null;
    n3dImageUrl: string | null;
};

export type N3dSyncImagePreview = {
    oldUrl: string | null;
    newUrl: string | null;
    oldCaption: string;
    newCaption: string;
    storageHint: string;
};

export type N3dSyncFilamentsPreview = {
    oldLines: FilamentLine[];
    newLines: FilamentLine[];
    oldDisplay: string;
    newDisplay: string;
    changed: boolean;
    defaultChoice: N3dSyncChoice;
};

export type N3dSyncDiffRow = {
    key: Exclude<N3dSyncFieldKey, "n3dImage" | "filaments">;
    label: string;
    oldDisplay: string;
    newDisplay: string;
    changed: boolean;
    defaultChoice: N3dSyncChoice;
};

export type N3dSyncPreview = {
    n3dSlugQueried: string;
    designSlug: string;
    rows: N3dSyncDiffRow[];
    image: N3dSyncImagePreview;
    filaments: N3dSyncFilamentsPreview;
    oldValues: N3dSyncFieldValues;
    newValues: N3dSyncFieldValues;
};

const FIELD_LABELS: Record<N3dSyncDiffRow["key"], string> = {
    name: "Nombre",
    category: "Categoría",
    n3dSlug: "Slug N3D",
    printTime: "Tiempo impresión (texto)",
    printTimeSeconds: "Tiempo impresión (segundos)",
    weightGrams: "Peso total filamentos (g)",
    pokemonName: "Nombre Pokémon",
    pokedexNumber: "Nº Pokédex",
    pokemonTypes: "Tipos Pokémon",
    longDescription: "Descripción larga (Pokédex)",
};

const TABLE_FIELD_KEYS: N3dSyncDiffRow["key"][] = [
    "name",
    "category",
    "n3dSlug",
    "printTime",
    "printTimeSeconds",
    "weightGrams",
    "pokemonName",
    "pokedexNumber",
    "pokemonTypes",
    "longDescription",
];

export async function productToFieldValues(product: Product): Promise<N3dSyncFieldValues> {
    const n3dImageUrl = await resolveN3dRenderUrl(product.slug);
    return {
        name: product.name,
        category: product.category,
        n3dSlug: product.n3dSlug ?? product.slug,
        printTime: product.printTime,
        printTimeSeconds: product.printTimeSeconds,
        weightGrams: product.weightGrams,
        pokemonName: product.pokemonName,
        pokedexNumber: product.pokedexNumber,
        pokemonTypes: product.pokemonTypes,
        longDescription: product.longDescription,
        n3dImageUrl,
    };
}

function displayForKey(key: N3dSyncDiffRow["key"], values: N3dSyncFieldValues): string {
    if (key === "pokemonTypes") {
        return values.pokemonTypes.length ? values.pokemonTypes.join(", ") : "—";
    }
    if (key === "printTimeSeconds" || key === "pokedexNumber" || key === "weightGrams") {
        return values[key] != null ? String(values[key]) : "—";
    }
    const v = values[key];
    return typeof v === "string" && v.trim() ? v : "—";
}

function valuesEqual(
    key: N3dSyncDiffRow["key"],
    oldV: N3dSyncFieldValues,
    newV: N3dSyncFieldValues,
): boolean {
    if (key === "pokemonTypes") {
        const a = [...oldV.pokemonTypes].sort().join(",");
        const b = [...newV.pokemonTypes].sort().join(",");
        return a === b;
    }
    return oldV[key] === newV[key];
}

export function buildN3dSyncPreview(
    oldValues: N3dSyncFieldValues,
    newValues: N3dSyncFieldValues,
    oldFilaments: FilamentLine[],
    newFilaments: FilamentLine[],
    n3dSlugQueried: string,
    designSlug: string,
    productSlug: string,
): N3dSyncPreview {
    const rows: N3dSyncDiffRow[] = TABLE_FIELD_KEYS.map((key) => {
        const changed = !valuesEqual(key, oldValues, newValues);
        return {
            key,
            label: FIELD_LABELS[key],
            oldDisplay: displayForKey(key, oldValues),
            newDisplay: displayForKey(key, newValues),
            changed,
            defaultChoice: "new" as const,
        };
    });

    const fChanged = filamentsChanged(oldFilaments, newFilaments);

    return {
        n3dSlugQueried,
        designSlug,
        rows,
        image: {
            oldUrl: oldValues.n3dImageUrl,
            newUrl: newValues.n3dImageUrl,
            oldCaption: oldValues.n3dImageUrl
                ? "Storage (actual)"
                : "Sin render en Storage",
            newCaption: newValues.n3dImageUrl
                ? "CDN N3D (thumbnail)"
                : "Sin imagen en API",
            storageHint: `${productSlug}/n3d/render.*`,
        },
        filaments: {
            oldLines: oldFilaments,
            newLines: newFilaments,
            oldDisplay: formatFilamentLines(oldFilaments),
            newDisplay: formatFilamentLines(newFilaments),
            changed: fChanged,
            defaultChoice: "new",
        },
        oldValues,
        newValues,
    };
}

export async function buildN3dSyncPreviewForProduct(product: Product): Promise<N3dSyncPreview> {
    const n3dSlugQueried = (product.n3dSlug ?? product.slug).trim();
    const design = await fetchN3dDesign(n3dSlugQueried);
    const oldFilaments = await loadProductFilamentLines(product.id);
    const newFilaments = mapN3dFilamentsToLines(design.filaments);
    const oldValues = await productToFieldValues(product);
    const newValues = mapN3dDesignToFieldValues(design);
    return buildN3dSyncPreview(
        oldValues,
        newValues,
        oldFilaments,
        newFilaments,
        n3dSlugQueried,
        design.slug,
        product.slug,
    );
}

function pickValue<K extends keyof N3dSyncFieldValues>(
    key: K,
    choice: N3dSyncChoice,
    oldValues: N3dSyncFieldValues,
    newValues: N3dSyncFieldValues,
): N3dSyncFieldValues[K] {
    return choice === "new" ? newValues[key] : oldValues[key];
}

export type N3dSyncApplyInput = {
    productId: string;
    slug: string;
    choices: Partial<Record<N3dSyncFieldKey, N3dSyncChoice>>;
};

export async function applyN3dSyncChoices(input: N3dSyncApplyInput): Promise<void> {
    const product = await db.product.findUnique({ where: { id: input.productId } });
    if (!product || product.slug !== input.slug) {
        throw new Error("Producto no encontrado.");
    }

    const n3dSlug = (product.n3dSlug ?? product.slug).trim();
    const design = await fetchN3dDesign(n3dSlug);
    const choiceFor = (key: N3dSyncFieldKey): N3dSyncChoice => input.choices[key] ?? "new";

    const allNew = (
        [
            "name",
            "category",
            "n3dSlug",
            "printTime",
            "printTimeSeconds",
            "weightGrams",
            "pokemonName",
            "pokedexNumber",
            "pokemonTypes",
            "longDescription",
            "filaments",
            "n3dImage",
        ] as N3dSyncFieldKey[]
    ).every((key) => choiceFor(key) === "new");

    if (allNew) {
        await applyFullN3dDataToProduct(product, design);
        return;
    }

    const freshOld = await productToFieldValues(product);
    const newV = mapN3dDesignToFieldValues(design);
    const newFilaments = mapN3dFilamentsToLines(design.filaments);

    await db.product.update({
        where: { id: product.id },
        data: {
            name: pickValue("name", choiceFor("name"), freshOld, newV),
            category: pickValue("category", choiceFor("category"), freshOld, newV),
            n3dSlug: pickValue("n3dSlug", choiceFor("n3dSlug"), freshOld, newV),
            printTime: pickValue("printTime", choiceFor("printTime"), freshOld, newV),
            printTimeSeconds: pickValue(
                "printTimeSeconds",
                choiceFor("printTimeSeconds"),
                freshOld,
                newV,
            ),
            weightGrams: pickValue("weightGrams", choiceFor("weightGrams"), freshOld, newV),
            pokemonName: pickValue("pokemonName", choiceFor("pokemonName"), freshOld, newV),
            pokedexNumber: pickValue("pokedexNumber", choiceFor("pokedexNumber"), freshOld, newV),
            pokemonTypes: pickValue("pokemonTypes", choiceFor("pokemonTypes"), freshOld, newV),
            longDescription: pickValue(
                "longDescription",
                choiceFor("longDescription"),
                freshOld,
                newV,
            ),
        },
    });

    if (choiceFor("filaments") === "new") {
        const { replaceProductFilaments } = await import("@/lib/product-filaments");
        await replaceProductFilaments(product.id, newFilaments);
    }

    if (choiceFor("n3dImage") === "new") {
        await downloadAndStoreN3dRender(product.slug, product.id, design);
    }

    await recordProductN3dSync(product.id);
}

export { mapN3dDesignToFieldValues } from "@/lib/n3d-catalog-sync";
