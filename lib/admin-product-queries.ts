import { Prisma, ProductStatus } from "@prisma/client";
import { getPilotSlugs } from "@/lib/ai-image-queue-file";
import { ADMIN_PRODUCTS_PAGE_SIZE } from "@/lib/admin-product-constants";
import { db } from "@/lib/db";

export type AdminProductListFilters = {
    q?: string;
    status?: ProductStatus | "";
    category?: string;
    visibility?: "visible" | "hidden" | "";
    image?: "no_ai" | "has_candidates" | "approved" | "needs_review" | "";
    pilot?: "1" | "";
    featured?: "1" | "0" | "";
    available?: "1" | "0" | "";
    page?: number;
};

const PAGE_SIZE = ADMIN_PRODUCTS_PAGE_SIZE;

function parsePage(value: number | undefined): number {
    if (!value || !Number.isFinite(value) || value < 1) return 1;
    return Math.floor(value);
}

export function buildProductListWhere(filters: AdminProductListFilters): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};
    const and: Prisma.ProductWhereInput[] = [];

    const q = filters.q?.trim();
    if (q) {
        and.push({
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
                { pokemonName: { contains: q, mode: "insensitive" } },
            ],
        });
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.category?.trim()) {
        where.category = filters.category.trim();
    }

    if (filters.visibility === "visible") {
        where.isVisibleInCatalog = true;
    } else if (filters.visibility === "hidden") {
        where.isVisibleInCatalog = false;
    }

    if (filters.featured === "1") {
        where.featured = true;
    } else if (filters.featured === "0") {
        where.featured = false;
    }

    if (filters.available === "1") {
        where.available = true;
    } else if (filters.available === "0") {
        where.available = false;
    }

    if (filters.pilot === "1") {
        const slugs = getPilotSlugs();
        where.slug = { in: slugs };
    }

    const aiImageFilter = filters.image;
    if (aiImageFilter === "approved") {
        and.push({
            images: { some: { origin: "ai_generated", status: "approved" } },
        });
    } else if (aiImageFilter === "has_candidates") {
        and.push({
            images: { some: { origin: "ai_generated", status: "candidate" } },
        });
    } else if (aiImageFilter === "no_ai") {
        and.push({
            images: { none: { origin: "ai_generated" } },
        });
    } else if (aiImageFilter === "needs_review") {
        and.push({
            images: { some: { origin: "ai_generated", status: "candidate" } },
        });
        and.push({
            NOT: {
                images: { some: { origin: "ai_generated", status: "approved" } },
            },
        });
    }

    if (and.length > 0) {
        where.AND = and;
    }

    return where;
}

export function parseFiltersFromSearchParams(
    params: Record<string, string | string[] | undefined>,
): AdminProductListFilters {
    const pick = (key: string) => {
        const v = params[key];
        return typeof v === "string" ? v : undefined;
    };

    return {
        q: pick("q"),
        status: pick("status") as ProductStatus | undefined,
        category: pick("category"),
        visibility: pick("visibility") as AdminProductListFilters["visibility"],
        image: pick("image") as AdminProductListFilters["image"],
        pilot: pick("pilot") as AdminProductListFilters["pilot"],
        featured: pick("featured") as AdminProductListFilters["featured"],
        available: pick("available") as AdminProductListFilters["available"],
        page: parsePage(Number(pick("page"))),
    };
}

export async function listAdminProducts(filters: AdminProductListFilters) {
    const page = parsePage(filters.page);
    const where = buildProductListWhere(filters);

    const [items, total] = await Promise.all([
        db.product.findMany({
            where,
            orderBy: { name: "asc" },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: {
                images: {
                    where: { origin: "ai_generated" },
                    select: { id: true, status: true },
                },
            },
        }),
        db.product.count({ where }),
    ]);

    return {
        items,
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
}

export function getImageStatusSummary(
    images: { status: string }[],
): "approved" | "candidates" | "none" | "rejected_only" {
    if (images.some((i) => i.status === "approved")) return "approved";
    if (images.some((i) => i.status === "candidate")) return "candidates";
    if (images.length > 0) return "rejected_only";
    return "none";
}
