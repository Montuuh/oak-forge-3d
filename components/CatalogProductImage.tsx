import Image from "next/image";
import { CATALOG_PLACEHOLDER_IMAGE_PATH, hasCatalogImage } from "@/lib/catalog-image";

type CatalogProductImageProps = {
    src: string;
    alt: string;
    className?: string;
    sizes?: string;
    priority?: boolean;
    fill?: boolean;
};

export function CatalogProductImage({
    src,
    alt,
    className = "object-cover",
    sizes,
    priority,
    fill = true,
}: CatalogProductImageProps) {
    if (!hasCatalogImage(src)) {
        return (
            <div
                className={`flex items-center justify-center bg-zinc-900/80 ${fill ? "absolute inset-0" : "h-full w-full"}`}
                aria-label={`${alt} — imagen pendiente`}
            >
                <span className="font-display text-4xl font-semibold tracking-widest text-zinc-600 md:text-5xl">
                    PND
                </span>
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            fill={fill}
            className={className}
            sizes={sizes}
            priority={priority}
        />
    );
}

export { CATALOG_PLACEHOLDER_IMAGE_PATH };
