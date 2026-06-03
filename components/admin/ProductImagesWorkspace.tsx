"use client";

import { AdminCollapsibleHelp } from "@/components/admin/AdminCollapsibleHelp";
import { AdminImageActions } from "@/components/admin/AdminImageActions";
import { AdminLocalImageSearch } from "@/components/admin/AdminLocalImageSearch";
import { AdminLocalImageUpload } from "@/components/admin/AdminLocalImageUpload";
import { AdminStudioScenePanel } from "@/components/admin/AdminStudioScenePanel";
import { ImageCandidateCard } from "@/components/admin/ImageCandidateCard";
import { isValidStoredImagePath } from "@/lib/catalog-image";
import {
    isAiGeneratedStoragePath,
    referenceImageAvailableOnDisk,
} from "@/lib/product-image-path";
import { getDefaultPromptVersion } from "@/lib/ai-image-prompt-versions";
import type { StudioSceneStatus } from "@/lib/studio-scene-types";
import { useState } from "react";

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

type ProductImagesWorkspaceProps = {
    productId: string;
    slug: string;
    images: ProductImage[];
    defaultSearchQuery: string;
    studioSceneStatus: StudioSceneStatus;
    generationProviderSummary: string;
};

function isReferenceImage(slug: string, image: ProductImage): boolean {
    if (image.origin !== "real_photo") return false;
    if (isAiGeneratedStoragePath(slug, image.imagePath)) return false;
    return true;
}

export function ProductImagesWorkspace({
    productId,
    slug,
    images,
    defaultSearchQuery,
    studioSceneStatus,
    generationProviderSummary,
}: ProductImagesWorkspaceProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [promptVersion, setPromptVersion] = useState(getDefaultPromptVersion);

    const referenceImages = images.filter((img) => isReferenceImage(slug, img));
    const aiImages = images.filter((img) => img.origin === "ai_generated");

    const referenceCount = referenceImages.filter(
        (img) => img.useAsReference && isValidStoredImagePath(img.imagePath),
    ).length;
    const activeCandidates = aiImages.filter(
        (img) =>
            (img.status === "candidate" || img.status === "approved") &&
            isValidStoredImagePath(img.imagePath),
    ).length;
    const approvedAi = aiImages.some(
        (img) => img.status === "approved" && isValidStoredImagePath(img.imagePath),
    );
    const approvedRef = referenceImages.some(
        (img) => img.status === "approved" && isValidStoredImagePath(img.imagePath),
    );
    const brokenAi = aiImages.filter((img) => !isValidStoredImagePath(img.imagePath)).length;
    return (
        <section className="glass rounded-2xl border border-white/10 p-4 md:p-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Imágenes</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                        Referencias {referenceCount} · Candidatos AI {activeCandidates}/5
                        {approvedAi || approvedRef ? " · Principal asignada" : " · Sin principal"}
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                        Referencias (estudio, N3D, manuales)
                    </h3>

                    <AdminCollapsibleHelp>
                        <p>
                            Marca <strong className="text-zinc-300">Usar como referencia</strong> en las
                            fotos que quieras enviar al generador. N3D aporta color; subidas y búsqueda web
                            aportan forma. El render N3D no se puede borrar. Las imágenes del catálogo (AI
                            aprobadas) no aparecen aquí.
                        </p>
                    </AdminCollapsibleHelp>

                    <AdminStudioScenePanel
                        initialStatus={studioSceneStatus}
                        promptVersion={promptVersion}
                        compact
                    />

                    <div className="mt-4 flex flex-wrap gap-2">
                        <AdminLocalImageUpload productId={productId} />
                        <button
                            type="button"
                            onClick={() => setSearchOpen((v) => !v)}
                            className="rounded-lg border border-white/15 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800"
                        >
                            {searchOpen ? "Ocultar búsqueda web" : "Buscar fotos (50)"}
                        </button>
                    </div>

                    {searchOpen && (
                        <div className="mt-3">
                            <AdminLocalImageSearch
                                productId={productId}
                                defaultQuery={defaultSearchQuery}
                            />
                        </div>
                    )}

                    {referenceImages.length === 0 ? (
                        <p className="mt-4 text-sm text-zinc-500">
                            Sin referencias. Sincroniza N3D o sube / importa una foto.
                        </p>
                    ) : (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {referenceImages.map((image) => (
                                <ImageCandidateCard
                                    key={image.id}
                                    image={image}
                                    productId={productId}
                                    productSlug={slug}
                                    variant="reference"
                                    originLabel={image.notes || "Referencia"}
                                    fileOnDisk={referenceImageAvailableOnDisk(image.imagePath)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-white/10 pt-6">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-violet-300/90">
                        Generación IA
                    </h3>

                    <AdminCollapsibleHelp>
                        <p>
                            Proveedor: <strong className="text-zinc-300">{generationProviderSummary}</strong> (
                            <code className="text-zinc-400">IMAGE_PROVIDER</code> en .env.local). Máximo 5
                            candidatos activos. Elige versión de prompt, revisa la escena v7 arriba y pulsa
                            generar. Aprueba una imagen para usarla en el catálogo público.
                        </p>
                    </AdminCollapsibleHelp>

                    <AdminImageActions
                        productId={productId}
                        showGenerate
                        generateOnly
                        candidateCount={activeCandidates}
                        studioSceneStatus={studioSceneStatus}
                        showStudioPanel={false}
                        generateLabel="Generar imagen IA"
                        promptVersion={promptVersion}
                        onPromptVersionChange={setPromptVersion}
                    />

                    {brokenAi > 0 && (
                        <p className="mt-2 text-xs text-amber-200">
                            {brokenAi} registro(s) incompleto(s) — elimínalos y vuelve a generar.
                        </p>
                    )}

                    {aiImages.length === 0 ? (
                        <p className="mt-4 text-sm text-zinc-500">Aún no hay candidatos generados.</p>
                    ) : (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {aiImages.map((image) => (
                                <ImageCandidateCard
                                    key={image.id}
                                    image={image}
                                    productId={productId}
                                    productSlug={slug}
                                    variant="ai"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
