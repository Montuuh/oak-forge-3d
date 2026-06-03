import { AdminImageActions } from "@/components/admin/AdminImageActions";
import { AdminLocalImageSearch } from "@/components/admin/AdminLocalImageSearch";
import { AdminLocalImageUpload } from "@/components/admin/AdminLocalImageUpload";
import { ImageCandidateCard } from "@/components/admin/ImageCandidateCard";
import { findQueueEntry } from "@/lib/ai-image-queue-file";
import { isValidStoredImagePath } from "@/lib/catalog-image";
import { localImageFileOnDisk } from "@/lib/admin-local-images";
import { getImageGenerationProviderSummary } from "@/lib/lifestyle-image-generation";

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
    isVisibleInCatalog?: boolean;
    defaultSearchQuery: string;
};

export function ProductImagesPanel({
    productId,
    slug,
    images,
    isVisibleInCatalog = false,
    defaultSearchQuery,
}: ProductImagesPanelProps) {
    const localImages = images.filter((img) => img.origin === "real_photo");
    const aiImages = images.filter((img) => img.origin === "ai_generated");
    const approvedLocal = localImages.find(
        (img) => img.status === "approved" && isValidStoredImagePath(img.imagePath),
    );
    const referenceCount = localImages.filter(
        (img) => img.useAsReference === true && isValidStoredImagePath(img.imagePath),
    ).length;
    const activeCandidates = aiImages.filter(
        (img) =>
            (img.status === "candidate" || img.status === "approved") &&
            isValidStoredImagePath(img.imagePath),
    ).length;
    const approved = aiImages.find(
        (img) => img.status === "approved" && isValidStoredImagePath(img.imagePath),
    );
    const brokenCount = aiImages.filter((img) => !isValidStoredImagePath(img.imagePath)).length;
    const queueEntry = findQueueEntry(slug);
    const generationProvider = getImageGenerationProviderSummary();

    return (
        <div className="space-y-8">
            <section className="glass rounded-2xl border border-white/10 p-4 md:p-6">
                <h2 className="mb-1 text-lg font-semibold">Imagenes locales / N3D</h2>
                <p className="mb-4 text-sm text-zinc-500">
                    Render N3D en <code className="text-zinc-400">public/images/products/</code> (protegido) o
                    subidas en <code className="text-zinc-400">public/images/uploads/</code>.
                    Marca <strong className="text-zinc-400">Usar como referencia</strong> para la generacion AI
                    ({referenceCount} activa{referenceCount === 1 ? "" : "s"}). N3D → color; subidas locales → forma.
                    Si solo tienes N3D, usa <strong className="text-zinc-400">Buscar 10 candidatos</strong> para importar una foto real.
                    Por defecto N3D y subidas vienen
                    marcadas. Estado de catalogo: rechazadas hasta Aprobar.
                </p>

                <div className="space-y-4">
                    <AdminLocalImageUpload productId={productId} />
                    <AdminLocalImageSearch
                        productId={productId}
                        defaultQuery={defaultSearchQuery}
                    />
                </div>

                {approvedLocal && (
                    <p className="mt-3 text-sm text-emerald-300">
                        Imagen local aprobada. Exporta el catalogo para publicarla en la web.
                    </p>
                )}

                {localImages.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-500">
                        Sin imagenes locales registradas. Sube una foto o ejecuta{" "}
                        <code className="text-zinc-400">npm run sync:catalog</code> y recarga esta pagina.
                    </p>
                ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {localImages.map((image) => (
                            <ImageCandidateCard
                                key={image.id}
                                image={image}
                                productId={productId}
                                productSlug={slug}
                                originLabel={image.notes || "Foto local"}
                                fileOnDisk={localImageFileOnDisk(image.imagePath)}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="glass rounded-2xl border border-white/10 p-4 md:p-6">
            <h2 className="mb-1 text-lg font-semibold">Imagenes AI</h2>
            <p className="mb-4 text-sm text-zinc-500">
                Generacion via <strong className="text-zinc-400">{generationProvider}</strong>.
                Maximo 5 candidatos activos por producto. Configura{" "}
                <code className="text-zinc-400">IMAGE_PROVIDER</code> en{" "}
                <code className="text-zinc-400">.env.local</code> (
                <code className="text-zinc-400">vertex</code> o{" "}
                <code className="text-zinc-400">aistudio</code>).
                {queueEntry && (
                    <span className="ml-1 text-zinc-400">
                        Cola piloto: {queueEntry.status}
                    </span>
                )}
            </p>

            <AdminImageActions
                productId={productId}
                showGenerate
                generateOnly
                candidateCount={activeCandidates}
            />

            {brokenCount > 0 && (
                <p className="mt-3 text-sm text-amber-200">
                    Hay {brokenCount} registro(s) incompleto(s). Usa <strong>Eliminar</strong> y
                    vuelve a generar si hace falta.
                </p>
            )}

            {approved || approvedLocal ? (
                <p className="mt-3 text-sm text-emerald-300">
                    Hay imagen aprobada (AI o local). Para la web: visibilidad en BD →{" "}
                    <code className="text-emerald-200/90">npm run catalog:export</code> → recargar /.
                </p>
            ) : (
                <p className="mt-3 text-sm text-zinc-500">
                    El catalogo publico muestra <strong className="text-zinc-400">PND</strong> hasta
                    que apruebes una imagen (local o AI) y exportes.
                </p>
            )}

            {isVisibleInCatalog && (
                <p className="mt-2 text-sm text-sky-200/90">
                    Este producto esta marcado como visible en BD. Si no aparece en /, ejecuta{" "}
                    <code className="text-sky-100/80">npm run catalog:export</code>.
                </p>
            )}

            {aiImages.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">
                    Sin candidatos. Genera la primera imagen con el boton de arriba.
                </p>
            ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {aiImages.map((image) => (
                        <ImageCandidateCard
                            key={image.id}
                            image={image}
                            productId={productId}
                            productSlug={slug}
                        />
                    ))}
                </div>
            )}
        </section>
        </div>
    );
}
