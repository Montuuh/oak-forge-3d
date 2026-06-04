import { ProductImagesWorkspace } from "@/components/admin/ProductImagesWorkspace";
import { getImageGenerationProviderSummary } from "@/lib/image-generation-provider";
import { getStudioSceneStatus } from "@/lib/studio-scene-reference";

type ProductImage = {
    id: string;
    status: "candidate" | "approved" | "rejected";
    origin: string;
    imagePath: string;
    useAsReference: boolean;
    sourceModel: string | null;
    promptVersion: string | null;
    createdAt: Date;
    notes: string | null;
};

type ProductImagesPanelProps = {
    productId: string;
    slug: string;
    images: ProductImage[];
    defaultSearchQuery: string;
    bare?: boolean;
};

export function ProductImagesPanel({
    productId,
    slug,
    images,
    defaultSearchQuery,
    bare = false,
}: ProductImagesPanelProps) {
    const studioSceneStatus = getStudioSceneStatus();
    const generationProviderSummary = getImageGenerationProviderSummary();

    return (
        <ProductImagesWorkspace
            productId={productId}
            slug={slug}
            images={images}
            defaultSearchQuery={defaultSearchQuery}
            studioSceneStatus={studioSceneStatus}
            generationProviderSummary={generationProviderSummary}
            bare={bare}
        />
    );
}
