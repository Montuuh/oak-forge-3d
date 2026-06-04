import { db } from "@/lib/db";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeProductSlug(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function validateProductSlug(slug: string): void {
    if (!slug) {
        throw new Error("El slug es obligatorio.");
    }
    if (slug.length > 120) {
        throw new Error("El slug es demasiado largo (max. 120 caracteres).");
    }
    if (!SLUG_PATTERN.test(slug)) {
        throw new Error(
            "Slug invalido. Usa solo letras minusculas, numeros y guiones (ej. 0001-bulbasaur).",
        );
    }
}

export async function assertProductSlugAvailable(
    slug: string,
    excludeProductId?: string,
): Promise<void> {
    const existing = await db.product.findUnique({
        where: { slug },
        select: { id: true },
    });
    if (existing && existing.id !== excludeProductId) {
        throw new Error(`Ya existe un producto con el slug "${slug}".`);
    }
}

export async function suggestDuplicateSlug(baseSlug: string): Promise<string> {
    let candidate = `${baseSlug}-copy`;
    let n = 2;
    while (await db.product.findUnique({ where: { slug: candidate }, select: { id: true } })) {
        candidate = `${baseSlug}-copy-${n}`;
        n += 1;
    }
    return candidate;
}
