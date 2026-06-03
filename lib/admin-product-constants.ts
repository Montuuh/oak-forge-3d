import type { ProductStatus } from "@prisma/client";

export const PRODUCT_STATUS_OPTIONS: ProductStatus[] = [
    "draft",
    "in_review",
    "published",
    "archived",
];

export const ADMIN_PRODUCTS_PAGE_SIZE = 40;
